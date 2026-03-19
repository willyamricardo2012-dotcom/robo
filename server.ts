import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig = { projectId: '' };
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

async function grantUserAccess(email: string, productId: string) {
  try {
    console.log(`Granting access to ${email} for product ${productId}`);
    
    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    let userId = '';
    if (snapshot.empty) {
      console.log(`User with email ${email} not found. Creating a placeholder or waiting for registration.`);
      // In a real app, we might create a pending access record or a placeholder user
      // For now, we'll store it in a 'pending_access' collection if user doesn't exist
      await db.collection('pending_access').add({
        email,
        productId,
        grantedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return;
    } else {
      userId = snapshot.docs[0].id;
    }

    // Grant access
    const accessRef = db.collection('user_access').doc(userId).collection('products').doc(productId);
    await accessRef.set({
      productId,
      grantedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    });

    console.log(`Access granted successfully to ${userId}`);
  } catch (error) {
    console.error('Error granting user access:', error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Mercado Pago Configuration
  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST-6056763484218320-031804-98438493849384938493849384938493-12345678' 
  });
  const payment = new Payment(client);

  // PicPay Configuration
  const PICPAY_TOKEN = process.env.PICPAY_TOKEN || 'TODO_PICPAY_TOKEN';
  const PICPAY_SELLER_TOKEN = process.env.PICPAY_SELLER_TOKEN || 'TODO_PICPAY_SELLER_TOKEN';

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Kiwify Webhook
  app.post('/api/kiwify/webhook', async (req, res) => {
    try {
      const payload = req.body;
      console.log('Kiwify Webhook received:', payload);

      if (payload.order_status === 'paid' || payload.order_status === 'approved') {
        const email = payload.customer?.email;
        const productId = payload.product?.product_id || payload.product?.product_name; // Use ID if available, else name as fallback
        
        if (email && productId) {
          await grantUserAccess(email, productId);
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Kiwify Webhook Error:', error);
      res.status(500).send('Error');
    }
  });

  // Kaptur Lead Capture
  app.post('/api/kaptur/lead', async (req, res) => {
    try {
      const { email, name, phone, apiKey, apiUrl } = req.body;
      
      if (!apiKey || !apiUrl) {
        return res.status(400).json({ error: 'Kaptur API Key and URL are required' });
      }

      const response = await fetch(`${apiUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ email, name, phone })
      });

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error('Kaptur Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create PicPay Payment
  app.post('/api/picpay/create', async (req, res) => {
    try {
      const { amount, description, email, firstName, lastName, document, phone, productId } = req.body;
      const referenceId = `${email}|${productId}|${Date.now()}`;

      const body = {
        referenceId,
        callbackUrl: `${process.env.APP_URL}/api/picpay/callback`,
        returnUrl: `${process.env.APP_URL}/checkout/success`,
        value: Number(amount),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 mins
        buyer: {
          firstName: firstName || 'Cliente',
          lastName: lastName || 'BotAI',
          document: document || '123.456.789-00',
          email: email || 'test@example.com',
          phone: phone || '+55 11 99999-9999'
        }
      };

      const response = await fetch('https://appws.picpay.com/ecommerce/public/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-picpay-token': PICPAY_TOKEN
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Error creating PicPay payment');
      }

      res.json({
        id: result.paymentId,
        referenceId,
        status: 'created',
        paymentUrl: result.paymentUrl,
        qrcode: result.qrcode,
        expiresAt: result.expiresAt
      });
    } catch (error: any) {
      console.error('PicPay Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // PicPay Callback (Webhook)
  app.post('/api/picpay/callback', async (req, res) => {
    try {
      const { referenceId, authorizationId } = req.body;
      const sellerToken = req.headers['x-seller-token'];

      if (sellerToken !== PICPAY_SELLER_TOKEN) {
        return res.status(401).send('Unauthorized');
      }

      console.log(`PicPay Payment ${referenceId} updated. Authorization ID: ${authorizationId}`);
      
      // Fetch status to confirm payment
      const statusResponse = await fetch(`https://appws.picpay.com/ecommerce/public/payments/${referenceId}/status`, {
        method: 'GET',
        headers: {
          'x-picpay-token': PICPAY_TOKEN
        }
      });
      const statusData = await statusResponse.json();

      if (statusData.status === 'paid') {
        // Extract email and productId from referenceId (we'll encode it as email|productId|timestamp)
        const [email, productId] = referenceId.split('|');
        if (email && productId) {
          await grantUserAccess(email, productId);
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('PicPay Callback Error:', error);
      res.status(500).send('Error');
    }
  });

  // Check PicPay Status
  app.get('/api/picpay/status/:referenceId', async (req, res) => {
    try {
      const { referenceId } = req.params;
      const response = await fetch(`https://appws.picpay.com/ecommerce/public/payments/${referenceId}/status`, {
        method: 'GET',
        headers: {
          'x-picpay-token': PICPAY_TOKEN
        }
      });

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create PIX Payment
  app.post('/api/pix/create', async (req, res) => {
    try {
      const { amount, description, email, firstName, lastName, productId } = req.body;

      const body = {
        transaction_amount: Number(amount),
        description: description || 'Bot.AI Vendas - Pagamento',
        payment_method_id: 'pix',
        external_reference: productId,
        payer: {
          email: email || 'test_user_123@test.com',
          first_name: firstName || 'Cliente',
          last_name: lastName || 'BotAI',
        },
      };

      const result = await payment.create({ body });
      
      res.json({
        id: result.id,
        status: result.status,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
        copy_paste: result.point_of_interaction?.transaction_data?.qr_code,
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
      });
    } catch (error: any) {
      console.error('Error creating PIX:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Webhook for Payment Notifications (Mercado Pago)
  app.post('/api/pix/webhook', async (req, res) => {
    try {
      const { action, data } = req.body;
      
      if (action === 'payment.updated' && data?.id) {
        const paymentInfo = await payment.get({ id: data.id });
        console.log(`Payment ${data.id} updated to status: ${paymentInfo.status}`);
        
        if (paymentInfo.status === 'approved') {
          const email = paymentInfo.payer?.email;
          const productId = paymentInfo.external_reference; // We'll use external_reference for productId
          
          if (email && productId) {
            await grantUserAccess(email, productId);
          }
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Error');
    }
  });

  // Check Payment Status
  app.get('/api/pix/status/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await payment.get({ id: Number(id) });
      res.json({
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
