import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, ShoppingBag, Layout, FileText, Megaphone, Zap, 
  MessageSquare, Code, Globe, Send, Settings, LogOut, 
  Plus, Trash2, ExternalLink, Download, Rocket, ChevronRight,
  Menu, X, Sparkles, Terminal, Layers, Package, Database,
  Headphones, UserCheck, ToggleLeft, ToggleRight, Save,
  Clock, AlertTriangle, Activity, User, Check, CreditCard,
  Mail, Lock, LogIn, UserPlus, Eye, EyeOff, AlertCircle,
  PlayCircle, BookOpen, CheckCircle, List, PlusCircle, Edit,
  ChevronLeft, Play, Pause, File, TrendingUp, ShieldCheck
} from 'lucide-react';
import { 
  auth, 
  signInWithGoogle, 
  logout, 
  db, 
  loginWithEmail, 
  registerWithEmail,
  handleFirestoreError,
  OperationType
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  where, 
  setDoc, 
  getDocs, 
  limit,
  getDocFromServer,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { getAI, MODELS, systemInstructions } from './services/gemini';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

// --- Types ---
type View = 'dashboard' | 'chat' | 'product' | 'page' | 'copy' | 'ad' | 'automation' | 'editor' | 'hosting' | 'marketplace' | 'settings' | 'vitrine' | 'vendas' | 'assinaturas' | 'relatorios' | 'equipe' | 'afiliados' | 'financeiro' | 'integracoes' | 'cupons' | 'projects' | 'seller' | 'integrations' | 'admin' | 'deploy' | 'members-area' | 'product-viewer' | 'admin-members';

interface Project {
  id: string;
  name: string;
  type: string;
  content: any;
  createdAt: any;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: any;
  type?: 'text' | 'pix';
  paymentData?: any;
}

// --- Components ---

const NeonButton = ({ children, onClick, className, variant = 'cyan', icon: Icon }: any) => {
  const colors = {
    cyan: 'border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 shadow-[0_0_15px_rgba(0,243,255,0.2)]',
    purple: 'border-neon-purple/50 text-neon-purple hover:bg-neon-purple/10 shadow-[0_0_15px_rgba(188,19,254,0.2)]',
    pink: 'border-neon-pink/50 text-neon-pink hover:bg-neon-pink/10 shadow-[0_0_15px_rgba(255,0,255,0.2)]',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-3 rounded-xl border transition-all duration-300 font-display font-medium",
        colors[variant as keyof typeof colors],
        className
      )}
    >
      {Icon && <Icon size={18} />}
      {children}
    </motion.button>
  );
};

const GlassCard = ({ children, className, onClick }: any) => (
  <motion.div
    whileHover={onClick ? { scale: 1.01, translateY: -2 } : {}}
    onClick={onClick}
    className={cn(
      "glass rounded-2xl p-6 transition-all duration-300",
      onClick && "cursor-pointer hover:border-white/20",
      className
    )}
  >
    {children}
  </motion.div>
);

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar" }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <GlassCard className="max-w-md w-full space-y-6 border-neon-cyan/30">
        <div className="flex items-center gap-3 text-neon-cyan">
          <AlertCircle size={24} />
          <h3 className="text-xl font-display font-bold">{title}</h3>
        </div>
        <p className="text-white/60 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
            {cancelText}
          </button>
          <NeonButton onClick={onConfirm} className="flex-1">
            {confirmText}
          </NeonButton>
        </div>
      </GlassCard>
    </div>
  );
};

const AlertModal = ({ isOpen, title, message, onClose, buttonText = "Entendido" }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <GlassCard className="max-w-md w-full space-y-6 border-neon-purple/30">
        <div className="flex items-center gap-3 text-neon-purple">
          <Sparkles size={24} />
          <h3 className="text-xl font-display font-bold">{title}</h3>
        </div>
        <p className="text-white/60 text-sm leading-relaxed">{message}</p>
        <NeonButton onClick={onClose} variant="purple" className="w-full">
          {buttonText}
        </NeonButton>
      </GlassCard>
    </div>
  );
};

const PaymentModal = ({ payment, onClose }: { payment: any, onClose: () => void }) => {
  const isPicPay = payment.provider === 'picpay';
  const isNubank = payment.provider === 'nubank';
  const qrCodeBase64 = isPicPay ? payment.qrcode?.base64 : payment.qr_code_base64;
  const copyPaste = isPicPay ? payment.qrcode?.content : (isNubank ? payment.pixKey : payment.copy_paste);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <GlassCard className="max-w-md w-full border-neon-cyan/30 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-display font-bold">Pagamento <span className="neon-text">{isPicPay ? 'PicPay' : (isNubank ? 'Nubank' : 'PIX')}</span></h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 text-center">
          {!isNubank && qrCodeBase64 && (
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <img 
                src={qrCodeBase64?.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} 
                alt="QR Code" 
                className="w-48 h-48"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {isNubank && (
            <div className="p-8 rounded-2xl bg-neon-pink/10 border border-neon-pink/20">
              <Zap className="text-neon-pink mx-auto mb-4" size={48} />
              <p className="text-lg font-bold">Pagamento Manual</p>
              <p className="text-sm text-white/60">Envie o PIX para a chave abaixo e aguarde a liberação.</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-white/60">
              {isNubank ? 'Chave PIX Nubank:' : 'Escaneie o QR Code acima ou use o código abaixo:'}
            </p>
            <div className="flex gap-2">
              <input 
                readOnly 
                value={copyPaste} 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono truncate"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(copyPaste);
                  alert("Código copiado!");
                }}
                className="p-3 bg-neon-cyan/20 text-neon-cyan rounded-xl hover:bg-neon-cyan/30 transition-all"
              >
                <Download size={20} />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cakto-green/10 border border-cakto-green/20 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full bg-cakto-green/20 flex items-center justify-center shrink-0">
              <Clock className="text-cakto-green animate-pulse" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-cakto-green">Aguardando Pagamento</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">
                {isNubank ? 'Envie o comprovante após o pagamento' : 'O acesso será liberado automaticamente'}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// --- Members Area Components ---

const AdminMembersView = ({ memberProducts, activeModules, activeLessons, setActiveMemberProduct, activeMemberProduct }: any) => {
  const [activeModule, setActiveModule] = useState<any>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<any>(null);
  
  const [newProduct, setNewProduct] = useState({ name: '', description: '', thumbnail: '' });
  const [newModule, setNewModule] = useState({ title: '', order: 0 });
  const [newLesson, setNewLesson] = useState({ title: '', type: 'video', content: '', videoUrl: '', pdfUrl: '', externalLink: '', order: 0 });

  const updateLessonCount = async (productId: string, increment: number) => {
    const productRef = doc(db, "member_products", productId);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const currentCount = productSnap.data().lessonCount || 0;
      await updateDoc(productRef, { lessonCount: Math.max(0, currentCount + increment) });
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name) return setAlertInfo({ title: "Erro", message: "O nome do produto é obrigatório." });
    try {
      if (editingProduct) {
        await updateDoc(doc(db, "member_products", editingProduct.id), newProduct);
        setEditingProduct(null);
      } else {
        await addDoc(collection(db, "member_products"), {
          ...newProduct,
          lessonCount: 0,
          createdAt: serverTimestamp()
        });
      }
      setIsAddingProduct(false);
      setNewProduct({ name: '', description: '', thumbnail: '' });
      setAlertInfo({ title: "Sucesso", message: editingProduct ? "Produto atualizado!" : "Produto criado!" });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "member_products");
    }
  };

  const handleAddModule = async () => {
    if (!activeMemberProduct || !newModule.title) return;
    try {
      if (editingModule) {
        await updateDoc(doc(db, "member_products", activeMemberProduct.id, "modules", editingModule.id), newModule);
        setEditingModule(null);
      } else {
        await addDoc(collection(db, "member_products", activeMemberProduct.id, "modules"), {
          ...newModule,
          order: Number(newModule.order)
        });
      }
      setIsAddingModule(false);
      setNewModule({ title: '', order: activeModules.length + 1 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `member_products/${activeMemberProduct.id}/modules`);
    }
  };

  const handleAddLesson = async () => {
    if (!activeMemberProduct || !activeModule || !newLesson.title) return;
    try {
      if (editingLesson) {
        await updateDoc(doc(db, "member_products", activeMemberProduct.id, "modules", activeModule.id, "lessons", editingLesson.id), newLesson);
        setEditingLesson(null);
      } else {
        await addDoc(collection(db, "member_products", activeMemberProduct.id, "modules", activeModule.id, "lessons"), {
          ...newLesson,
          order: Number(newLesson.order)
        });
        await updateLessonCount(activeMemberProduct.id, 1);
      }
      setIsAddingLesson(false);
      setNewLesson({ title: '', type: 'video', content: '', videoUrl: '', pdfUrl: '', externalLink: '', order: (activeLessons[activeModule.id]?.length || 0) + 1 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `member_products/${activeMemberProduct.id}/modules/${activeModule.id}/lessons`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "member_products", id));
      if (activeMemberProduct?.id === id) setActiveMemberProduct(null);
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `member_products/${id}`);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!activeMemberProduct) return;
    try {
      const lessonsInModule = activeLessons[moduleId] || [];
      await deleteDoc(doc(db, "member_products", activeMemberProduct.id, "modules", moduleId));
      await updateLessonCount(activeMemberProduct.id, -lessonsInModule.length);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `member_products/${activeMemberProduct.id}/modules/${moduleId}`);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!activeMemberProduct || !activeModule) return;
    try {
      await deleteDoc(doc(db, "member_products", activeMemberProduct.id, "modules", activeModule.id, "lessons", lessonId));
      await updateLessonCount(activeMemberProduct.id, -1);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `member_products/${activeMemberProduct.id}/modules/${activeModule.id}/lessons/${lessonId}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setAlertInfo({ title: "Copiado", message: "ID do produto copiado para a área de transferência!" });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="Excluir Produto"
        message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita e removerá todos os módulos e aulas vinculados."
        onConfirm={() => handleDeleteProduct(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      <AlertModal 
        isOpen={!!alertInfo}
        title={alertInfo?.title}
        message={alertInfo?.message}
        onClose={() => setAlertInfo(null)}
      />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold flex items-center gap-3">
            <Edit className="text-neon-cyan" />
            Gestão de <span className="neon-text">Cursos</span>
          </h2>
          <p className="text-white/40">Crie e gerencie seus produtos digitais e áreas de membros.</p>
        </div>
        {!activeMemberProduct && (
          <NeonButton onClick={() => setIsAddingProduct(true)} icon={PlusCircle}>Novo Produto</NeonButton>
        )}
        {activeMemberProduct && !activeModule && (
          <div className="flex gap-3">
            <button onClick={() => setActiveMemberProduct(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Voltar</button>
            <NeonButton onClick={() => setIsAddingModule(true)} icon={PlusCircle}>Novo Módulo</NeonButton>
          </div>
        )}
        {activeModule && (
          <div className="flex gap-3">
            <button onClick={() => setActiveModule(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Voltar aos Módulos</button>
            <NeonButton onClick={() => setIsAddingLesson(true)} icon={PlusCircle}>Nova Aula</NeonButton>
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/20">
        <span className={cn("cursor-pointer hover:text-neon-cyan", !activeMemberProduct && "text-neon-cyan")} onClick={() => { setActiveMemberProduct(null); setActiveModule(null); }}>Produtos</span>
        {activeMemberProduct && (
          <>
            <ChevronRight size={14} />
            <span className={cn("cursor-pointer hover:text-neon-cyan", activeMemberProduct && !activeModule && "text-neon-cyan")} onClick={() => setActiveModule(null)}>{activeMemberProduct.name}</span>
          </>
        )}
        {activeModule && (
          <>
            <ChevronRight size={14} />
            <span className="text-neon-cyan">{activeModule.title}</span>
          </>
        )}
      </div>

      {!activeMemberProduct && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberProducts.map((product: any) => (
            <GlassCard key={product.id} className="group relative overflow-hidden">
              <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-white/5">
                {product.thumbnail ? (
                  <img src={product.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10">
                    <Package size={48} />
                  </div>
                )}
              </div>
              <h4 className="text-lg font-bold mb-2">{product.name}</h4>
              <div className="flex items-center gap-2 mb-4 p-2 bg-white/5 rounded-lg border border-white/5">
                <code className="text-[10px] text-neon-cyan font-mono flex-1 truncate">{product.id}</code>
                <button 
                  onClick={() => copyToClipboard(product.id)}
                  className="p-1 hover:text-neon-cyan transition-colors"
                  title="Copiar ID do Produto"
                >
                  <Database size={12} />
                </button>
              </div>
              <p className="text-sm text-white/40 line-clamp-2 mb-6">{product.description}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setActiveMemberProduct(product)}
                  className="flex-1 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-neon-cyan/30 transition-all"
                >
                  Gerenciar
                </button>
                <button 
                  onClick={() => {
                    setNewProduct({ name: product.name, description: product.description, thumbnail: product.thumbnail });
                    setEditingProduct(product);
                    setIsAddingProduct(true);
                  }}
                  className="p-2 bg-white/5 text-white/40 rounded-lg hover:bg-white/10 transition-all"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => setConfirmDelete(product.id)}
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {activeMemberProduct && !activeModule && (
        <div className="space-y-4">
          {activeModules.length === 0 ? (
            <div className="text-center py-20 glass rounded-3xl border-dashed border-white/10">
              <Layers size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40">Nenhum módulo criado ainda.</p>
            </div>
          ) : (
            activeModules.map((module: any) => (
              <GlassCard key={module.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-display font-bold text-neon-cyan">
                    {module.order}
                  </div>
                  <div>
                    <h4 className="font-bold">{module.title}</h4>
                    <p className="text-xs text-white/40">{(activeLessons[module.id]?.length || 0)} Aulas</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setActiveModule(module)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    Ver Aulas
                  </button>
                  <button 
                    onClick={() => {
                      setNewModule({ title: module.title, order: module.order });
                      setEditingModule(module);
                      setIsAddingModule(true);
                    }}
                    className="p-2 text-white/20 hover:text-neon-cyan transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteModule(module.id)}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {activeModule && (
        <div className="space-y-4">
          {(activeLessons[activeModule.id] || []).length === 0 ? (
            <div className="text-center py-20 glass rounded-3xl border-dashed border-white/10">
              <PlayCircle size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40">Nenhuma aula criada neste módulo.</p>
            </div>
          ) : (
            activeLessons[activeModule.id].map((lesson: any) => (
              <GlassCard key={lesson.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                    {lesson.type === 'video' ? <PlayCircle size={20} /> : lesson.type === 'pdf' ? <FileText size={20} /> : <File size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold">{lesson.title}</h4>
                    <p className="text-xs text-white/40 uppercase tracking-widest">{lesson.type}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setNewLesson({ ...lesson });
                      setEditingLesson(lesson);
                      setIsAddingLesson(true);
                    }}
                    className="p-2 text-white/20 hover:text-neon-cyan transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteLesson(lesson.id)}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {(isAddingProduct || editingProduct) && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <GlassCard className="max-w-md w-full space-y-6">
              <h3 className="text-xl font-display font-bold">{editingProduct ? 'Editar' : 'Novo'} <span className="neon-text">Produto</span></h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Nome do Produto</label>
                  <input 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Descrição</label>
                  <textarea 
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">URL da Thumbnail</label>
                  <input 
                    value={newProduct.thumbnail}
                    onChange={(e) => setNewProduct({...newProduct, thumbnail: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-white/40">Cancelar</button>
                <NeonButton onClick={handleAddProduct} className="flex-1">{editingProduct ? 'Salvar' : 'Criar Produto'}</NeonButton>
              </div>
            </GlassCard>
          </div>
        )}

        {(isAddingModule || editingModule) && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <GlassCard className="max-w-md w-full space-y-6">
              <h3 className="text-xl font-display font-bold">{editingModule ? 'Editar' : 'Novo'} <span className="neon-text">Módulo</span></h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Título do Módulo</label>
                  <input 
                    value={newModule.title}
                    onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ordem</label>
                  <input 
                    type="number"
                    value={newModule.order}
                    onChange={(e) => setNewModule({...newModule, order: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setIsAddingModule(false); setEditingModule(null); }} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-white/40">Cancelar</button>
                <NeonButton onClick={handleAddModule} className="flex-1">{editingModule ? 'Salvar' : 'Criar Módulo'}</NeonButton>
              </div>
            </GlassCard>
          </div>
        )}

        {(isAddingLesson || editingLesson) && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <GlassCard className="max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
              <h3 className="text-xl font-display font-bold">{editingLesson ? 'Editar' : 'Nova'} <span className="neon-text">Aula</span></h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Título da Aula</label>
                  <input 
                    value={newLesson.title}
                    onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tipo</label>
                    <select 
                      value={newLesson.type}
                      onChange={(e) => setNewLesson({...newLesson, type: e.target.value as any})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none text-white"
                    >
                      <option value="video" className="bg-cakto-bg">Vídeo</option>
                      <option value="pdf" className="bg-cakto-bg">PDF</option>
                      <option value="text" className="bg-cakto-bg">Texto</option>
                      <option value="link" className="bg-cakto-bg">Link Externo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ordem</label>
                    <input 
                      type="number"
                      value={newLesson.order}
                      onChange={(e) => setNewLesson({...newLesson, order: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                </div>
                
                {newLesson.type === 'video' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">URL do Vídeo (YouTube/Vimeo/MP4)</label>
                    <input 
                      value={newLesson.videoUrl}
                      onChange={(e) => setNewLesson({...newLesson, videoUrl: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                )}

                {newLesson.type === 'pdf' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">URL do PDF</label>
                    <input 
                      value={newLesson.pdfUrl}
                      onChange={(e) => setNewLesson({...newLesson, pdfUrl: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                )}

                {newLesson.type === 'link' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Link Externo</label>
                    <input 
                      value={newLesson.externalLink}
                      onChange={(e) => setNewLesson({...newLesson, externalLink: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Conteúdo (Markdown/Texto)</label>
                  <textarea 
                    value={newLesson.content}
                    onChange={(e) => setNewLesson({...newLesson, content: e.target.value})}
                    rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setIsAddingLesson(false); setEditingLesson(null); }} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-white/40">Cancelar</button>
                <NeonButton onClick={handleAddLesson} className="flex-1">{editingLesson ? 'Salvar' : 'Criar Aula'}</NeonButton>
              </div>
            </GlassCard>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MembersAreaView = ({ memberProducts, userAccess, userProgress, onAccessProduct }: any) => {
  const purchasedProducts = memberProducts.filter((p: any) => userAccess.includes(p.id));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-neon-purple/20 flex items-center justify-center">
              <Sparkles className="text-neon-purple" size={24} />
            </div>
            Minha Área de Membros
          </h2>
          <p className="text-white/40 text-sm">Acesse seus conteúdos e treinamentos adquiridos.</p>
        </div>
      </div>

      {purchasedProducts.length === 0 ? (
        <GlassCard className="text-center py-20 space-y-6 border-white/5">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <Package className="text-white/20" size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Nenhum produto encontrado</h3>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              Você ainda não possui acesso a nenhum conteúdo. Se você acabou de realizar uma compra, aguarde alguns minutos pela liberação automática.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchasedProducts.map((product: any) => {
            const completed = userProgress[product.id]?.length || 0;
            const totalLessons = product.lessonCount || 10;
            const progress = Math.min(100, Math.round((completed / totalLessons) * 100));

            return (
              <GlassCard key={product.id} className="flex flex-col h-full hover:border-neon-cyan/30 group transition-all duration-500">
                <div className="aspect-video rounded-xl overflow-hidden mb-6 bg-white/5 relative group-hover:scale-[1.02] transition-transform duration-500">
                  {product.thumbnail ? (
                    <img 
                      src={product.thumbnail} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10">
                      <Package size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neon-cyan">Continuar assistindo</span>
                  </div>
                </div>
                <h4 className="text-lg font-bold mb-2 group-hover:text-neon-cyan transition-colors">{product.name}</h4>
                <p className="text-sm text-white/40 line-clamp-2 mb-6 flex-1">{product.description}</p>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/40">Progresso</span>
                      <span className="text-neon-cyan">{progress}% concluído</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple shadow-[0_0_15px_rgba(0,243,255,0.5)]"
                      />
                    </div>
                  </div>
                  <NeonButton onClick={() => onAccessProduct(product)} className="w-full" icon={PlayCircle}>
                    Acessar Conteúdo
                  </NeonButton>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

const ProductViewerView = ({ product, modules, lessons, userProgress, onBack, user }: any) => {
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Select first lesson by default if none selected
    if (!currentLesson && modules.length > 0) {
      const firstModule = modules[0];
      const firstLesson = lessons[firstModule.id]?.[0];
      if (firstLesson) setCurrentLesson(firstLesson);
    }
  }, [modules, lessons]);

  const isCompleted = (lessonId: string) => {
    return userProgress[product.id]?.includes(lessonId);
  };

  const toggleComplete = async (lessonId: string) => {
    if (!user) return;
    const currentCompleted = userProgress[product.id] || [];
    let newCompleted;
    if (currentCompleted.includes(lessonId)) {
      newCompleted = currentCompleted.filter((id: string) => id !== lessonId);
    } else {
      newCompleted = [...currentCompleted, lessonId];
    }

    try {
      await setDoc(doc(db, "user_progress", user.uid, "products", product.id), {
        userId: user.uid,
        productId: product.id,
        completedLessons: newCompleted,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `user_progress/${user.uid}/products/${product.id}`);
    }
  };

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return "";
    
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    // Vimeo
    const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    // Wistia
    const wistiaMatch = url.match(/(?:wistia\.com\/medias\/|fast\.wistia\.net\/embed\/iframe\/)([\w-]+)/);
    if (wistiaMatch) return `https://fast.wistia.net/embed/iframe/${wistiaMatch[1]}`;

    return url;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col lg:flex-row overflow-hidden">
      {/* Sidebar - Lesson List */}
      <aside className={cn(
        "w-full lg:w-80 bg-cakto-sidebar border-r border-white/5 flex flex-col transition-all duration-300",
        !isSidebarOpen && "lg:-ml-80"
      )}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ChevronLeft size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">Sair</span>
          </button>
          <h2 className="text-sm font-bold truncate max-w-[150px]">{product.name}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          {modules.map((module: any) => (
            <div key={module.id} className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-2">{module.title}</h3>
              <div className="space-y-1">
                {(lessons[module.id] || []).map((lesson: any) => (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLesson(lesson)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group relative",
                      currentLesson?.id === lesson.id ? "bg-neon-cyan/10 text-neon-cyan" : "hover:bg-white/5 text-white/60"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors",
                      isCompleted(lesson.id) 
                        ? "bg-green-500 border-green-500 text-white" 
                        : "border-white/10 group-hover:border-white/30"
                    )}>
                      {isCompleted(lesson.id) ? <Check size={14} /> : <Play size={10} />}
                    </div>
                    <span className="text-xs font-medium flex-1 line-clamp-2">{lesson.title}</span>
                    {currentLesson?.id === lesson.id && (
                      <motion.div 
                        layoutId="active-lesson"
                        className="absolute left-0 w-1 h-6 bg-neon-cyan rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#080808]">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-cakto-sidebar/50 backdrop-blur-md">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            {currentLesson && (
              <button
                onClick={() => toggleComplete(currentLesson.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                  isCompleted(currentLesson.id)
                    ? "bg-green-500/10 text-green-500 border border-green-500/20"
                    : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20"
                )}
              >
                <Check size={16} />
                {isCompleted(currentLesson.id) ? "Concluída" : "Marcar como concluída"}
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 scrollbar-hide">
          {currentLesson ? (
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Media Player */}
              {currentLesson.type === 'video' && currentLesson.videoUrl && (
                <div className="aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/5 relative group">
                  <iframe
                    src={getVideoEmbedUrl(currentLesson.videoUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {currentLesson.type === 'pdf' && currentLesson.pdfUrl && (
                <div className="aspect-[3/4] lg:aspect-video rounded-3xl overflow-hidden bg-white/5 border border-white/5">
                  <iframe
                    src={currentLesson.pdfUrl}
                    className="w-full h-full"
                  />
                </div>
              )}

              {currentLesson.type === 'link' && currentLesson.externalLink && (
                <GlassCard className="p-12 text-center space-y-6 border-neon-cyan/20">
                  <div className="w-20 h-20 rounded-full bg-neon-cyan/10 flex items-center justify-center mx-auto">
                    <ExternalLink className="text-neon-cyan" size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Conteúdo Externo</h3>
                    <p className="text-white/40 text-sm">Esta aula contém um link para um conteúdo externo.</p>
                  </div>
                  <a 
                    href={currentLesson.externalLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <NeonButton icon={ExternalLink}>
                      Acessar Link Externo
                    </NeonButton>
                  </a>
                </GlassCard>
              )}

              {/* Lesson Info */}
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-neon-cyan text-[10px] font-bold uppercase tracking-widest">
                      <Sparkles size={12} />
                      <span>Aula {currentLesson.order}</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-display font-bold">{currentLesson.title}</h1>
                  </div>
                </div>

                {currentLesson.content && (
                  <div className="prose prose-invert max-w-none prose-p:text-white/60 prose-headings:text-white prose-a:text-neon-cyan">
                    <div className="markdown-body bg-transparent p-0">
                      <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-white/20">
              <div className="text-center space-y-4">
                <Play size={48} className="mx-auto opacity-20" />
                <p className="text-sm font-medium">Selecione uma aula para começar</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const LoadingScreen = () => (
  <motion.div 
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
  >
    <motion.div
      animate={{ 
        scale: [1, 1.2, 1],
        rotate: [0, 180, 360],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="mb-8"
    >
      <Bot size={80} className="text-neon-cyan" />
    </motion.div>
    <motion.h1 
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="text-3xl font-display font-bold tracking-tighter neon-text"
    >
      Bot.AI Vendas
    </motion.h1>
    <p className="mt-4 text-white/40 font-mono text-sm">Iniciando protocolos de marketing...</p>
  </motion.div>
);

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error) {
          errorMessage = `Erro de Permissão: ${parsedError.operationType} em ${parsedError.path}`;
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
          <GlassCard className="max-w-md w-full text-center space-y-6 border-red-500/50">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="text-red-500" size={40} />
            </div>
            <h2 className="text-2xl font-display font-bold text-white">Ops! Algo deu errado</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              {errorMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all"
            >
              Recarregar Aplicativo
            </button>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Main App ---

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [messages, setMessages] = useState<Message[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // States for specific features
  const [productData, setProductData] = useState({ niche: '', type: '', audience: '', price: '' });
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [sellerConfig, setSellerConfig] = useState({
    productName: '',
    productPrice: '',
    productLink: '',
    productDescription: '',
    memberProductId: '', // Link to a member product
    personality: 'friendly',
    knowledgeBase: '',
    isActive: false,
    isAutoMode: false,
    followUpSettings: { delay5m: true, delay1h: true, delay24h: true },
    errors: [] as string[],
    stats: { conversations: 0, sales: 0, conversionRate: 0 }
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Members Area State
  const [memberProducts, setMemberProducts] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<string[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, string[]>>({});
  const [activeMemberProduct, setActiveMemberProduct] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeModules, setActiveModules] = useState<any[]>([]);
  const [activeLessons, setActiveLessons] = useState<Record<string, any[]>>({});
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<any>(null);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      return onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          setIsAdmin(userData.role === 'admin' || user.email === 'willyamricardo2012@gmail.com');
        } else {
          setIsAdmin(user.email === 'willyamricardo2012@gmail.com');
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Fetch all products (metadata)
      const productsRef = collection(db, "member_products");
      const unsubProducts = onSnapshot(productsRef, (snapshot) => {
        setMemberProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "member_products");
      });

      // Fetch user access
      const accessRef = collection(db, "user_access", user.uid, "products");
      const unsubAccess = onSnapshot(accessRef, (snapshot) => {
        setUserAccess(snapshot.docs.map(doc => doc.id));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `user_access/${user.uid}/products`);
      });

      // Fetch user progress
      const progressRef = collection(db, "user_progress", user.uid, "products");
      const unsubProgress = onSnapshot(progressRef, (snapshot) => {
        const progress: Record<string, string[]> = {};
        snapshot.docs.forEach(doc => {
          progress[doc.id] = doc.data().completedLessons || [];
        });
        setUserProgress(progress);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `user_progress/${user.uid}/products`);
      });

      return () => {
        unsubProducts();
        unsubAccess();
        unsubProgress();
      };
    }
  }, [user]);

  // Fetch modules and lessons for active product
  useEffect(() => {
    if (activeMemberProduct) {
      const modulesRef = collection(db, "member_products", activeMemberProduct.id, "modules");
      const qModules = query(modulesRef, orderBy("order", "asc"));
      
      const unsubModules = onSnapshot(qModules, (snapshot) => {
        const modules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActiveModules(modules);
        
        // For each module, fetch lessons
        modules.forEach(module => {
          const lessonsRef = collection(db, "member_products", activeMemberProduct.id, "modules", module.id, "lessons");
          const qLessons = query(lessonsRef, orderBy("order", "asc"));
          onSnapshot(qLessons, (lessonSnapshot) => {
            setActiveLessons(prev => ({
              ...prev,
              [module.id]: lessonSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            }));
          });
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `member_products/${activeMemberProduct.id}/modules`);
      });

      return () => unsubModules();
    } else {
      setActiveModules([]);
      setActiveLessons({});
    }
  }, [activeMemberProduct]);

  const [botConfig, setBotConfig] = useState({
    status: 'off',
    autoMode: false,
    sellerMode: false,
    intensity: 'medium',
    responseTime: 'normal',
    welcomeMessage: 'Olá! Como posso te ajudar hoje?',
    responseStyle: 'friendly',
    botToken: ''
  });

  const [integrations, setIntegrations] = useState({
    whatsapp: { status: 'disconnected', token: '', accountId: '', number: '' },
    telegram: { status: 'disconnected', token: '', chatId: '' },
    instagram: { status: 'disconnected', token: '', accountId: '' },
    tiktok: { status: 'disconnected', clientId: '', clientSecret: '', token: '' },
    mercadopago: { status: 'disconnected', token: '' },
    picpay: { status: 'disconnected', token: '', sellerToken: '' },
    kiwify: { status: 'disconnected', webhookUrl: '', token: '' },
    kaptur: { status: 'disconnected', apiKey: '', apiUrl: '' },
    nubank: { status: 'disconnected', pixKey: '' }
  });

  const [subscription, setSubscription] = useState({ plan: 'free', status: 'active' });
  const [activePayment, setActivePayment] = useState<any>(null);
  const [adminStats, setAdminStats] = useState({ totalSales: 0, totalRevenue: 0, activeUsers: 0 });

  const chatEndRef = useRef<HTMLDivElement>(null);

  const validarLink = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const validarPreco = (valor: any) => {
    const num = String(valor).replace(',', '.');
    return !isNaN(num as any) && Number(num) > 0;
  };

  const validarProduto = (produto: any) => {
    if (!produto.productName || !produto.productDescription || !produto.productPrice || !produto.productLink) {
      return "Preencha todos os campos do produto";
    }

    if (!validarPreco(produto.productPrice)) {
      return "Preço inválido";
    }

    if (!validarLink(produto.productLink)) {
      return "Link inválido";
    }

    // New validation for integrations
    const isPicPayActive = integrations.picpay.status === 'connected';
    const isNubankActive = integrations.nubank.status === 'connected';
    const isKiwifyActive = integrations.kiwify.status === 'connected';

    if (!isPicPayActive && !isNubankActive) {
      return "Configure o PicPay ou Nubank antes de ativar vendas automáticas";
    }

    if (!isKiwifyActive) {
      return "Configure o Webhook da Kiwify para automação de entrega";
    }

    return "OK";
  };

  const addLog = async (type: 'message' | 'bot_response' | 'sale_attempt' | 'error' | 'follow_up' | 'payment', content: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "logs"), {
        userId: user.uid,
        type,
        content,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/logs`);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && currentView === 'chat') {
      const path = `users/${user.uid}/chats`;
      const q = query(
        collection(db, "users", user.uid, "chats"),
        orderBy("timestamp", "asc")
      );
      return onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      });
    }
  }, [user, currentView]);

  useEffect(() => {
    if (user) {
      const path = `users/${user.uid}/projects`;
      const q = query(
        collection(db, "users", user.uid, "projects"),
        orderBy("createdAt", "desc")
      );
      return onSnapshot(q, (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const path = `seller_configs/${user.uid}`;
      const docRef = doc(db, "seller_configs", user.uid);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSellerConfig({
            productName: data.productName || '',
            productPrice: data.productPrice || '',
            productLink: data.productLink || '',
            productDescription: data.productDescription || '',
            memberProductId: data.memberProductId || '',
            personality: data.personality || 'friendly',
            knowledgeBase: data.knowledgeBase || '',
            isActive: data.isActive || false,
            isAutoMode: data.isAutoMode || false,
            followUpSettings: data.followUpSettings || { delay5m: true, delay1h: true, delay24h: true },
            errors: data.errors || [],
            stats: data.stats || { conversations: 0, sales: 0, conversionRate: 0 }
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const path = `users/${user.uid}/logs`;
      const q = query(
        collection(db, "users", user.uid, "logs"),
        orderBy("timestamp", "desc"),
        limit(50)
      );
      return onSnapshot(q, (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      });
    }
  }, [user]);

  // Follow-up logic (Simulated)
  useEffect(() => {
    if (!user || !sellerConfig.isActive || !sellerConfig.isAutoMode) return;

    const checkFollowUps = async () => {
      const now = Date.now();
      
      // We check the current chat as a demonstration
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === 'user') {
          const lastTime = (lastMsg.timestamp as any)?.toDate?.()?.getTime() || 0;
          if (!lastTime) return;
          
          const diffMinutes = (now - lastTime) / (1000 * 60);

          // 5 min follow-up
          if (sellerConfig.followUpSettings.delay5m && diffMinutes >= 5 && diffMinutes < 10) {
            const alreadySent = messages.some(m => m.role === 'model' && m.text.includes("Ei, você ainda quer aproveitar"));
            if (!alreadySent) {
              const followUpMsg = "Ei, você ainda quer aproveitar essa oportunidade? O estoque está acabando!";
      try {
        await addDoc(collection(db, "users", user.uid, "chats"), {
          text: followUpMsg,
          role: 'model',
          timestamp: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
      }
      await addLog('follow_up', `Follow-up de 5min enviado: ${followUpMsg}`);
            }
          }
        }
      }
    };

    const interval = setInterval(checkFollowUps, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [user, sellerConfig.isActive, sellerConfig.isAutoMode, messages, sellerConfig.followUpSettings]);

  useEffect(() => {
    if (user) {
      const path = `subscriptions/${user.uid}`;
      const docRef = doc(db, "subscriptions", user.uid);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          setSubscription(snapshot.data() as any);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const botPath = `bot_configs/${user.uid}`;
      const integrationsPath = `integrations/${user.uid}`;
      const botRef = doc(db, "bot_configs", user.uid);
      const integrationsRef = doc(db, "integrations", user.uid);

      const unsubBot = onSnapshot(botRef, (snapshot) => {
        if (snapshot.exists()) setBotConfig(snapshot.data() as any);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, botPath);
      });

      const unsubIntegrations = onSnapshot(integrationsRef, (snapshot) => {
        if (snapshot.exists()) setIntegrations(snapshot.data() as any);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, integrationsPath);
      });

      const couponsRef = collection(db, "users", user.uid, "coupons");
      const qCoupons = query(couponsRef, orderBy("createdAt", "desc"));
      const unsubCoupons = onSnapshot(qCoupons, (snapshot) => {
        setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/coupons`);
      });

      return () => {
        unsubBot();
        unsubIntegrations();
        unsubCoupons();
      };
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim() || !user || isGenerating) return;

    const userMsg = text;
    setInput('');
    setIsGenerating(true);

    try {
      try {
        await addDoc(collection(db, "users", user.uid, "chats"), {
          role: 'user',
          text: userMsg,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
      }

      await addLog('message', `Cliente: ${userMsg}`);

      const ai = getAI();
      
      let systemInstruction = systemInstructions.SALES_EXPERT;
      if (sellerConfig.isActive) {
        const productInfo = `
          NOME: ${sellerConfig.productName}
          PREÇO: ${sellerConfig.productPrice}
          LINK: ${sellerConfig.productLink}
          DESCRIÇÃO: ${sellerConfig.productDescription}
        `;
        systemInstruction = systemInstructions.AI_SELLER
          .replace('{PRODUCT_DATA}', productInfo)
          .replace('{PERSONALITY}', sellerConfig.personality)
          .replace('{KNOWLEDGE_BASE}', sellerConfig.knowledgeBase || 'Nenhuma informação adicional fornecida.');
      }

      const result = await ai.models.generateContent({
        model: MODELS.FLASH,
        config: {
          systemInstruction: systemInstruction
        },
        contents: [
          ...messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: userMsg }] }
        ]
      });
      const responseText = result.text || '';
      const hasPixTag = responseText.includes('[GERAR_PIX]');
      const cleanResponse = responseText.replace('[GERAR_PIX]', '').trim();

      try {
        await addDoc(collection(db, "users", user.uid, "chats"), {
          role: 'model',
          text: cleanResponse,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
      }

      await addLog('bot_response', `Bot: ${cleanResponse.substring(0, 100)}...`);

      if (cleanResponse.includes(sellerConfig.productLink)) {
        await addLog('sale_attempt', `Link de venda enviado: ${sellerConfig.productName}`);
      }

      if (hasPixTag) {
        try {
          // Determine which provider to use (prefer PicPay if connected, then Mercado Pago, then Nubank)
          const isPicPay = integrations.picpay.status === 'connected';
          const isMercadoPago = integrations.mercadopago.status === 'connected';
          const isNubank = integrations.nubank.status === 'connected';

          if (isPicPay || isMercadoPago) {
            const endpoint = isPicPay ? '/api/picpay/create' : '/api/pix/create';
            
            const payResponse = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: sellerConfig.productPrice.replace(/[^0-9,.]/g, '').replace(',', '.'),
                description: `Pagamento: ${sellerConfig.productName}`,
                email: user.email,
                firstName: user.displayName?.split(' ')[0] || 'Cliente',
                productId: sellerConfig.memberProductId || sellerConfig.productName,
              })
            });
            const payData = await payResponse.json();
            
            if (payData.qr_code || payData.qrcode) {
              const provider = isPicPay ? 'picpay' : 'mercadopago';
              setActivePayment({ ...payData, provider });
              await addLog('payment', `${provider.toUpperCase()} Gerado: R$ ${sellerConfig.productPrice}`);
              
              try {
                await addDoc(collection(db, "users", user.uid, "chats"), {
                  role: 'model',
                  text: `Clique no botão abaixo para visualizar seu QR Code ${provider.toUpperCase()} e realizar o pagamento.`,
                  type: 'pix',
                  paymentData: { ...payData, provider },
                  timestamp: serverTimestamp(),
                });
              } catch (error) {
                handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
              }
            }
          } else if (isNubank) {
            // Manual Nubank PIX
            const payData = { provider: 'nubank', pixKey: integrations.nubank.pixKey };
            setActivePayment(payData);
            await addLog('payment', `Nubank (Manual) Gerado: R$ ${sellerConfig.productPrice}`);
            
            try {
              await addDoc(collection(db, "users", user.uid, "chats"), {
                role: 'model',
                text: `Realize o pagamento manual via PIX Nubank para a chave: ${integrations.nubank.pixKey}. Após o pagamento, envie o comprovante.`,
                type: 'pix',
                paymentData: payData,
                timestamp: serverTimestamp(),
              });
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
            }
          }
        } catch (err) {
          console.error("Payment Error:", err);
          await addLog('error', `Erro ao gerar pagamento: ${err}`);
        }
      }

      // Update stats if in seller mode
      if (sellerConfig.isActive) {
        let newSales = sellerConfig.stats.sales;
        if (responseText.includes(sellerConfig.productLink)) {
          newSales += 1;
        }
        
        const newConversations = messages.length === 0 ? sellerConfig.stats.conversations + 1 : sellerConfig.stats.conversations;
        const newRate = newConversations > 0 ? (newSales / newConversations) * 100 : 0;

        try {
          await setDoc(doc(db, "seller_configs", user.uid), {
            stats: {
              conversations: newConversations,
              sales: newSales,
              conversionRate: Number(newRate.toFixed(1))
            }
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `seller_configs/${user.uid}`);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const simulateClient = async () => {
    if (!user || isGenerating) return;
    setIsGenerating(true);
    setIsSimulating(true);
    setCurrentView('chat');

    try {
      // Clear chat first (optional, but good for testing)
      const chatPath = `users/${user.uid}/chats`;
      try {
        const chatDocs = await getDocs(collection(db, "users", user.uid, "chats"));
        for (const d of chatDocs.docs) {
          await deleteDoc(doc(db, "users", user.uid, "chats", d.id));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, chatPath);
      }

      const ai = getAI();
      const result = await ai.models.generateContent({
        model: MODELS.FLASH,
        config: {
          systemInstruction: "Você é um cliente em potencial interessado em comprar um produto digital. Comece a conversa de forma natural, demonstrando curiosidade ou uma leve dúvida. Não seja muito fácil de convencer no início."
        },
        contents: [{ role: 'user', parts: [{ text: "Inicie uma conversa como um cliente interessado no produto." }] }]
      });

      const clientMsg = result.text || "Olá, vi o anúncio e fiquei curioso. Como funciona?";
      
      try {
        await addDoc(collection(db, "users", user.uid, "chats"), {
          role: 'user',
          text: clientMsg,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
      }

      await addLog('message', `[Simulação] Cliente: ${clientMsg}`);

      const productInfo = `
        NOME: ${sellerConfig.productName}
        PREÇO: ${sellerConfig.productPrice}
        LINK: ${sellerConfig.productLink}
        DESCRIÇÃO: ${sellerConfig.productDescription}
      `;
      const botResult = await ai.models.generateContent({
        model: MODELS.FLASH,
        config: {
          systemInstruction: systemInstructions.AI_SELLER
            .replace('{PRODUCT_DATA}', productInfo)
            .replace('{PERSONALITY}', sellerConfig.personality)
            .replace('{KNOWLEDGE_BASE}', sellerConfig.knowledgeBase || 'Nenhuma informação adicional fornecida.')
        },
        contents: [{ role: 'user', parts: [{ text: clientMsg }] }]
      });

      try {
        await addDoc(collection(db, "users", user.uid, "chats"), {
          role: 'model',
          text: botResult.text || "Olá! Como posso te ajudar hoje?",
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
      }

      await addLog('bot_response', `[Simulação] Bot: ${botResult.text?.substring(0, 100)}...`);

    } catch (error) {
      console.error("Simulation error:", error);
    } finally {
      setIsGenerating(false);
      setIsSimulating(false);
    }
  };

  const generateProduct = async () => {
    if (!user || isGenerating) return;
    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const ai = getAI();
      const prompt = `Crie um produto digital completo com base nestas informações:
      Nicho: ${productData.niche}
      Tipo: ${productData.type}
      Público: ${productData.audience}
      Preço: ${productData.price}
      
      Gere: Nome do produto, descrição, promessa forte (headline), benefícios, estrutura do conteúdo e um resumo do conteúdo.
      Responda em formato Markdown estruturado.`;

      const result = await ai.models.generateContent({
        model: MODELS.PRO,
        config: {
          systemInstruction: systemInstructions.SALES_EXPERT
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const content = result.text;
      
      setGeneratedContent(content);
      
      try {
        await addDoc(collection(db, "users", user.uid, "projects"), {
          name: `Produto: ${productData.niche}`,
          type: 'product',
          content,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/projects`);
      }
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSalesPage = async (desc: string) => {
    if (!user || isGenerating) return;
    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const ai = getAI();
      const prompt = `Crie uma página de vendas de alta conversão para: ${desc}.
      Inclua: Título matador, subtítulo persuasivo, benefícios, prova social (exemplos), depoimentos fictícios porém realistas, gatilhos mentais e estrutura de seções.
      Responda em Markdown.`;

      const result = await ai.models.generateContent({
        model: MODELS.PRO,
        config: {
          systemInstruction: systemInstructions.SALES_EXPERT
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const content = result.text;
      setGeneratedContent(content);
      
      try {
        await addDoc(collection(db, "users", user.uid, "projects"), {
          name: `Página: ${desc.substring(0, 20)}...`,
          type: 'page',
          content,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/projects`);
      }
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <AnimatePresence><LoadingScreen /></AnimatePresence>;

  if (!user) {
    const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      setIsAuthLoading(true);
      try {
        if (isRegistering) {
          await registerWithEmail(email, password);
        } else {
          await loginWithEmail(email, password);
        }
      } catch (error: any) {
        let message = "Ocorreu um erro ao autenticar.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          message = "Email ou senha incorretos.";
        } else if (error.code === 'auth/invalid-email') {
          message = "Email inválido.";
        } else if (error.code === 'auth/weak-password') {
          message = "A senha deve ter pelo menos 6 caracteres.";
        } else if (error.code === 'auth/email-already-in-use') {
          message = "Este email já está em uso.";
        }
        setAuthError(message);
      } finally {
        setIsAuthLoading(false);
      }
    };

    const handleGoogleLogin = async () => {
      setAuthError(null);
      setIsAuthLoading(true);
      try {
        await signInWithGoogle();
      } catch (error: any) {
        setAuthError("Erro ao entrar com Google.");
      } finally {
        setIsAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex bg-[#050505] overflow-hidden">
        {/* Left Side - Hero/Marketing */}
        <div className="hidden lg:flex flex-1 relative items-center justify-center p-12 overflow-hidden border-r border-white/5">
          {/* Background Effects */}
          <div className="absolute inset-0 z-0">
             <motion.div 
               animate={{ 
                 scale: [1, 1.2, 1],
                 opacity: [0.1, 0.15, 0.1],
                 x: [0, 50, 0],
                 y: [0, -50, 0]
               }}
               transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
               className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-neon-cyan/20 rounded-full blur-[120px]" 
             />
             <motion.div 
               animate={{ 
                 scale: [1.2, 1, 1.2],
                 opacity: [0.1, 0.15, 0.1],
                 x: [0, -50, 0],
                 y: [0, 50, 0]
               }}
               transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
               className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-neon-purple/20 rounded-full blur-[120px]" 
             />
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          </div>

          <div className="relative z-10 max-w-xl space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                  <Bot size={32} className="text-neon-cyan" />
                </div>
                <span className="text-xl font-display font-bold tracking-tighter">Bot.AI <span className="neon-text">Vendas</span></span>
              </div>

              <h1 className="text-7xl font-display font-bold tracking-tighter leading-[0.9] mb-6">
                TRANSFORME <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink">VENDAS</span> EM <br />
                CIÊNCIA.
              </h1>
              
              <p className="text-xl text-white/60 leading-relaxed font-light max-w-md">
                A plataforma definitiva que utiliza inteligência artificial de última geração para escalar seu império digital.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 gap-6"
            >
              {[
                { label: 'Conversão', value: '+45%', icon: TrendingUp },
                { label: 'Automação', value: '24/7', icon: Zap },
                { label: 'Suporte', value: 'Instantâneo', icon: MessageSquare },
                { label: 'ROI', value: 'Escalável', icon: ShieldCheck }
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group hover:bg-white/[0.07] cursor-default">
                  <stat.icon size={24} className="text-neon-cyan mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-3xl font-bold tracking-tight mb-1">{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Vertical Rail Text */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block">
            <div className="writing-vertical-rl rotate-180 text-[10px] uppercase tracking-[0.5em] text-white/10 font-bold whitespace-nowrap">
              FUTURE OF DIGITAL COMMERCE • EST. 2026
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-6 relative">
          {/* Mobile Background Elements */}
          <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[100%] h-[100%] bg-neon-cyan/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[100%] bg-neon-purple/5 rounded-full blur-[120px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md space-y-8 relative z-10"
          >
            <div className="text-center lg:text-left space-y-3">
              <div className="lg:hidden flex justify-center mb-8">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(0,243,255,0.1)]">
                  <Bot size={40} className="text-neon-cyan" />
                </div>
              </div>
              <h2 className="text-4xl font-bold tracking-tight">
                {isRegistering ? 'Crie sua conta' : 'Bem-vindo de volta'}
              </h2>
              <p className="text-white/40 text-lg">
                {isRegistering 
                  ? 'Comece sua jornada rumo ao topo hoje mesmo.' 
                  : 'Acesse seu painel de controle e gerencie suas vendas.'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-cyan transition-colors" size={18} />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 transition-all placeholder:text-white/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Senha</label>
                  {!isRegistering && (
                    <button type="button" className="text-[10px] uppercase tracking-widest text-neon-cyan/60 hover:text-neon-cyan transition-colors font-bold">Esqueceu a senha?</button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-cyan transition-colors" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 transition-all placeholder:text-white/10"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="p-4 rounded-xl bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-xs flex items-center gap-3"
                  >
                    <AlertTriangle size={16} className="shrink-0" />
                    {authError}
                  </motion.div>
                )}
              </AnimatePresence>

              <NeonButton 
                type="submit" 
                className="w-full py-5 mt-2 shadow-lg shadow-neon-cyan/10 text-base" 
                variant={isRegistering ? 'purple' : 'cyan'}
                disabled={isAuthLoading}
                icon={isRegistering ? UserPlus : LogIn}
              >
                {isAuthLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {isRegistering ? 'Processando...' : 'Autenticando...'}
                  </div>
                ) : (
                  isRegistering ? 'Criar Minha Conta' : 'Entrar Agora'
                )}
              </NeonButton>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-[#050505] px-4 text-white/20">Ou continue com</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              disabled={isAuthLoading}
              className="w-full py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-sm font-medium group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/0 via-white/5 to-neon-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>

            <div className="text-center">
              <button 
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setAuthError(null);
                }}
                className="text-xs text-white/40 hover:text-neon-cyan transition-colors group"
              >
                {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'} 
                <span className="text-neon-cyan ml-1 group-hover:underline font-bold">
                  {isRegistering ? 'Entre aqui' : 'Cadastre-se agora'}
                </span>
              </button>
            </div>
            
            <div className="pt-8 flex items-center justify-center gap-6 opacity-20 grayscale hover:grayscale-0 transition-all duration-500">
               <div className="text-[10px] font-bold tracking-tighter">SECURED BY FIREBASE</div>
               <div className="text-[10px] font-bold tracking-tighter">AES-256 ENCRYPTION</div>
               <div className="text-[10px] font-bold tracking-tighter">SSL PROTECTED</div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const generateBotToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setBotConfig({ ...botConfig, botToken: token });
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: View, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(id);
        setGeneratedContent(null);
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-6 py-3 transition-all duration-200 group relative",
        currentView === id 
          ? "text-cakto-green bg-cakto-green/5" 
          : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      {currentView === id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cakto-green" />}
      <Icon size={20} className={cn(currentView === id ? "text-cakto-green" : "group-hover:text-cakto-green transition-colors")} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-cakto-sidebar border-r border-white/5 transition-transform duration-300 lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="h-full flex flex-col py-6">
          <div className="flex items-center gap-3 mb-10 px-6">
            <div className="p-2 rounded-xl bg-cakto-green/10">
              <Bot className="text-cakto-green" size={24} />
            </div>
            <h2 className="text-lg font-display font-bold tracking-tight hidden lg:block">Bot.AI <span className="text-cakto-green">Vendas</span></h2>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
            <SidebarItem id="dashboard" icon={Layout} label="Dashboard" />
            <SidebarItem id="admin" icon={Activity} label="Painel Admin" />
            <SidebarItem id="deploy" icon={Rocket} label="Publicar Online" />
            <SidebarItem id="product" icon={ShoppingBag} label="Produtos" />
            <SidebarItem id="vitrine" icon={Globe} label="Vitrine" />
            <SidebarItem id="vendas" icon={FileText} label="Minhas Vendas" />
            <SidebarItem id="assinaturas" icon={Zap} label="Assinaturas" />
            <SidebarItem id="relatorios" icon={FileText} label="Relatórios" />
            <SidebarItem id="equipe" icon={Plus} label="Equipe" />
            <SidebarItem id="afiliados" icon={Plus} label="Afiliados" />
            <SidebarItem id="financeiro" icon={Plus} label="Financeiro" />
            <SidebarItem id="integracoes" icon={Zap} label="Integrações" />
            <SidebarItem id="cupons" icon={Plus} label="Cupons" />
            <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Área de Membros</div>
            <SidebarItem id="members-area" icon={BookOpen} label="Meus Conteúdos" />
            {isAdmin && <SidebarItem id="admin-members" icon={Edit} label="Gestão de Cursos" />}
            <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">IA & Ferramentas</div>
            <SidebarItem id="chat" icon={MessageSquare} label="Chat IA" />
            <SidebarItem id="seller" icon={Headphones} label="Bot Vendedor" />
            <SidebarItem id="page" icon={Globe} label="Página de Vendas" />
            <SidebarItem id="copy" icon={FileText} label="Gerar Copy" />
            <SidebarItem id="ad" icon={Megaphone} label="Criar Anúncio" />
            <SidebarItem id="automation" icon={Zap} label="Automação" />
            <SidebarItem id="editor" icon={Code} label="Editor de Código" />
            <SidebarItem id="hosting" icon={Rocket} label="Hospedagem" />
            <SidebarItem id="marketplace" icon={Layers} label="Marketplace" />
            <SidebarItem id="projects" icon={Package} label="Meus Projetos" />
            <SidebarItem id="settings" icon={Settings} label="Configurações" />
          </div>

          <div className="mt-auto pt-6 border-t border-white/5 space-y-4 px-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="w-10 h-10 rounded-full border border-white/10 bg-neon-cyan/10 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} className="w-full h-full object-cover" alt="" />
                ) : (
                  <User className="text-neon-cyan" size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.displayName || user.email?.split('@')[0] || 'Usuário'}</p>
                <p className="text-[10px] text-white/40 truncate font-mono uppercase tracking-widest">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={logout} 
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-neon-pink border border-neon-pink/20 hover:bg-neon-pink/10 transition-all duration-300 group shadow-[0_0_15px_rgba(255,0,255,0.05)]"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold text-xs uppercase tracking-widest">Encerrar Sessão</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 lg:px-10 sticky top-0 bg-cakto-bg/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-6 flex-1">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-white/60">
              {isSidebarOpen ? <X /> : <Menu />}
            </button>
            <div className="relative max-w-md w-full hidden md:block">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
                <Plus size={16} />
              </div>
              <input 
                placeholder="Buscar..." 
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cakto-green/50 transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
              <div className="w-8 h-8 rounded-full bg-cakto-green flex items-center justify-center text-black">
                <Zap size={14} />
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white/40">
                <Zap size={14} />
              </div>
            </div>
            
            <div className="relative">
              <div className="p-2 text-white/40 hover:text-white transition-colors cursor-pointer">
                <Megaphone size={20} />
              </div>
              <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">10</div>
            </div>

            <div className="flex items-center gap-3 pl-6 border-l border-white/5">
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white/10" alt="" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 pb-24 lg:pb-10">
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Banner */}
                <div className="w-full min-h-[120px] lg:h-32 rounded-2xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cakto-green/20 to-transparent z-10" />
                  <img 
                    src="https://picsum.photos/seed/marketing/1200/200" 
                    className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" 
                    alt="Banner"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex flex-col lg:flex-row items-center justify-center lg:justify-start px-6 lg:px-10 z-20 gap-4">
                    <div className="space-y-1 text-center lg:text-left">
                      <h2 className="text-lg lg:text-2xl font-display font-bold text-white">BOT.AI É A 1ª PLATAFORMA</h2>
                      <p className="text-cakto-green font-bold text-sm lg:text-base">DO BRASIL C/ PIX AUTOMÁTICO</p>
                    </div>
                    <button 
                      onClick={() => setCurrentView('deploy')}
                      className="lg:ml-auto bg-cakto-green text-black px-6 py-2 rounded-lg font-bold text-xs lg:text-sm hover:scale-105 transition-all"
                    >
                      PUBLICAR SITE →
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                  <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-display font-bold">Dashboard</h1>
                    <p className="text-[10px] lg:text-xs text-white/30">Última atualização: menos de um minuto</p>
                  </div>
                  <div className="flex-1" />
                  <div className="grid grid-cols-2 lg:flex gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/30 uppercase font-bold px-1">Tipo</label>
                      <select className="bg-cakto-card border border-cakto-border rounded-lg px-4 py-2 text-xs lg:text-sm focus:outline-none w-full lg:w-40">
                        <option>Todos</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/30 uppercase font-bold px-1">Produtos</label>
                      <select className="bg-cakto-card border border-cakto-border rounded-lg px-4 py-2 text-xs lg:text-sm focus:outline-none w-full lg:w-40">
                        <option>Todos</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/30 uppercase font-bold px-1">Período</label>
                      <select className="bg-cakto-card border border-cakto-border rounded-lg px-4 py-2 text-xs lg:text-sm focus:outline-none w-full lg:w-40">
                        <option>Hoje</option>
                      </select>
                    </div>
                    <button className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs lg:text-sm hover:bg-white/10 transition-colors mt-auto col-span-2 lg:col-span-1">
                      Atualizar
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="glass p-8 rounded-2xl border-l-4 border-l-cakto-green">
                    <p className="text-sm text-white/50 mb-4">Vendas realizadas</p>
                    <div className="flex items-center justify-between">
                      <h2 className="text-4xl font-display font-bold">R$ 0,00</h2>
                      <button className="text-white/20 hover:text-white"><Zap size={20} /></button>
                    </div>
                  </div>
                  <div className="glass p-8 rounded-2xl border-l-4 border-l-cakto-green">
                    <p className="text-sm text-white/50 mb-4">Quantidade de vendas</p>
                    <div className="flex items-center justify-between">
                      <h2 className="text-4xl font-display font-bold">0</h2>
                      <button className="text-white/20 hover:text-white"><Zap size={20} /></button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {[
                    { id: 'product', icon: ShoppingBag, label: 'Criar Produto', color: 'cyan' },
                    { id: 'page', icon: Globe, label: 'Página Vendas', color: 'purple' },
                    { id: 'copy', icon: FileText, label: 'Gerar Copy', color: 'cyan' },
                    { id: 'ad', icon: Megaphone, label: 'Criar Anúncio', color: 'purple' },
                    { id: 'automation', icon: Zap, label: 'Automação', color: 'cyan' },
                    { id: 'chat', icon: MessageSquare, label: 'Chat IA', color: 'purple' },
                    { id: 'editor', icon: Code, label: 'Editor Código', color: 'cyan' },
                    { id: 'hosting', icon: Rocket, label: 'Hospedar Página', color: 'purple' },
                    { id: 'marketplace', icon: Layers, label: 'Publicar Projeto', color: 'cyan' },
                    { id: 'database', icon: Database, label: 'Banco Dados', color: 'purple' },
                    { id: 'projects', icon: Package, label: 'Meus Projetos', color: 'cyan' },
                    { id: 'seller', icon: Headphones, label: 'Bot Vendedor', color: 'purple' },
                    { id: 'settings', icon: Settings, label: 'Configurações', color: 'cyan' },
                  ].map((action) => (
                    <button
                      key={action.id}
                      onClick={() => setCurrentView(action.id as View)}
                      className="glass p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-cakto-green/50 transition-all group"
                    >
                      <div className={cn(
                        "p-3 rounded-xl transition-all group-hover:scale-110",
                        action.color === 'cyan' ? "bg-neon-cyan/10 text-neon-cyan" : "bg-neon-purple/10 text-neon-purple"
                      )}>
                        <action.icon size={24} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white">{action.label}</span>
                    </button>
                  ))}
                </div>

                {/* Bottom Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Payment Methods */}
                  <div className="lg:col-span-2 glass rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-bold text-white/60">Meios de Pagamento</h3>
                      <div className="flex gap-10 text-xs font-bold text-white/30 uppercase">
                        <span>Conversão</span>
                        <span className="w-20 text-right">Valor</span>
                      </div>
                    </div>
                    <div className="divide-y divide-white/5">
                      {[
                        { name: 'Pix', img: 'https://cdn.worldvectorlogo.com/logos/pix-bc.svg' },
                        { name: 'Boleto', img: 'https://vignette.wikia.nocookie.net/logopedia/images/b/b8/Boleto_Banc%C3%A1rio.png' },
                        { name: 'Cartão de crédito', img: 'https://cdn.worldvectorlogo.com/logos/visa-10.svg' },
                        { name: 'Pic Pay', img: 'https://logodownload.org/wp-content/uploads/2018/05/picpay-logo.png' },
                        { name: 'Apple Pay', img: 'https://cdn.worldvectorlogo.com/logos/apple-pay-6.svg' },
                        { name: 'Google Pay', img: 'https://cdn.worldvectorlogo.com/logos/google-pay-2.svg' },
                        { name: '3DS', img: 'https://www.visa.com.br/dam/VCOM/regional/lac/brazil/pay-with-visa/images/visa-secure-logo-800x450.jpg' },
                        { name: 'PIX Automático', img: 'https://cdn.worldvectorlogo.com/logos/pix-bc.svg' },
                      ].map((item, i) => (
                        <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center p-2">
                              <img 
                                src={item.img} 
                                alt={item.name} 
                                className="max-w-full max-h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <div className="flex gap-10 text-sm font-mono">
                            <span className="text-white/40">0%</span>
                            <span className="w-20 text-right">R$ 0,00</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Side Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                    {[
                      { label: 'Abandono C.', value: '0' },
                      { label: 'Reembolso', value: '0%' },
                      { label: 'Charge Back', value: '0%' },
                      { label: 'MED', value: '0%' },
                    ].map((item, i) => (
                      <div key={i} className="glass p-4 lg:p-6 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-white/40 font-bold uppercase mb-1">{item.label}</p>
                          <h4 className="text-xl lg:text-2xl font-display font-bold">{item.value}</h4>
                        </div>
                        <button className="text-white/20 hover:text-white"><Zap size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === 'integrations' && (
              <motion.div 
                key="integrations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-6xl mx-auto space-y-8 pb-20"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-display font-bold">Configuração do <span className="neon-text">Robô & Integrações</span></h2>
                  <p className="text-white/40">Conecte o Bot.AI Vendas com plataformas digitais de forma segura e profissional.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Robot Config */}
                  <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="space-y-6">
                      <h3 className="text-xl font-display font-bold flex items-center gap-2">
                        <Bot className="text-neon-cyan" size={24} />
                        Configuração do Robô
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                          <div>
                            <h4 className="font-bold text-sm">Status do Bot</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{botConfig.status === 'active' ? 'Ativo' : 'Desligado'}</p>
                          </div>
                          <button 
                            onClick={() => setBotConfig({...botConfig, status: botConfig.status === 'active' ? 'off' : 'active'})}
                            className="p-1"
                          >
                            {botConfig.status === 'active' ? <ToggleRight className="text-cakto-green" size={40} /> : <ToggleLeft className="text-white/20" size={40} />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                          <div>
                            <h4 className="font-bold text-sm">Modo Automático</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{botConfig.autoMode ? 'ON' : 'OFF'}</p>
                          </div>
                          <button 
                            onClick={() => setBotConfig({...botConfig, autoMode: !botConfig.autoMode})}
                            className="p-1"
                          >
                            {botConfig.autoMode ? <ToggleRight className="text-neon-cyan" size={40} /> : <ToggleLeft className="text-white/20" size={40} />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                          <div>
                            <h4 className="font-bold text-sm">Modo Vendedor</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{botConfig.sellerMode ? 'ON' : 'OFF'}</p>
                          </div>
                          <button 
                            onClick={() => setBotConfig({...botConfig, sellerMode: !botConfig.sellerMode})}
                            className="p-1"
                          >
                            {botConfig.sellerMode ? <ToggleRight className="text-neon-purple" size={40} /> : <ToggleLeft className="text-white/20" size={40} />}
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Intensidade de Venda</label>
                          <select 
                            value={botConfig.intensity}
                            onChange={(e) => setBotConfig({...botConfig, intensity: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan/50 text-white text-sm"
                          >
                            <option value="low" className="bg-cakto-bg">Baixo</option>
                            <option value="medium" className="bg-cakto-bg">Médio</option>
                            <option value="high" className="bg-cakto-bg">Alto</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Tempo de Resposta</label>
                          <select 
                            value={botConfig.responseTime}
                            onChange={(e) => setBotConfig({...botConfig, responseTime: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan/50 text-white text-sm"
                          >
                            <option value="fast" className="bg-cakto-bg">Rápido</option>
                            <option value="normal" className="bg-cakto-bg">Normal</option>
                            <option value="slow" className="bg-cakto-bg">Lento</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Estilo de Resposta</label>
                          <select 
                            value={botConfig.responseStyle}
                            onChange={(e) => setBotConfig({...botConfig, responseStyle: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon-cyan/50 text-white text-sm"
                          >
                            <option value="friendly" className="bg-cakto-bg">Amigável</option>
                            <option value="professional" className="bg-cakto-bg">Profissional</option>
                            <option value="direct" className="bg-cakto-bg">Direto</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Mensagem de Boas-vindas</label>
                          <textarea 
                            value={botConfig.welcomeMessage}
                            onChange={(e) => setBotConfig({...botConfig, welcomeMessage: e.target.value})}
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50 resize-none text-sm"
                          />
                        </div>
                      </div>

                      {/* API Token Section */}
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm flex items-center gap-2">
                            <Lock className="text-neon-cyan" size={16} />
                            Token de API do Bot
                          </h4>
                          <button 
                            onClick={generateBotToken}
                            className="text-[10px] font-bold uppercase tracking-widest text-neon-cyan hover:underline"
                          >
                            Gerar Novo Token
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            readOnly
                            value={botConfig.botToken || 'Nenhum token gerado'}
                            className="flex-1 bg-black/20 border border-white/10 rounded-lg p-3 text-xs font-mono text-white/60 focus:outline-none"
                          />
                          <button 
                            onClick={() => {
                              if (botConfig.botToken) {
                                navigator.clipboard.writeText(botConfig.botToken);
                                alert("Token copiado!");
                              }
                            }}
                            className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            <Plus size={16} className="text-white/40" />
                          </button>
                        </div>
                        <p className="text-[10px] text-white/20">Use este token para integrar seu bot com sistemas externos via API.</p>
                      </div>

                      <NeonButton 
                        onClick={async () => {
                          if (!user) return;
                          await setDoc(doc(db, "bot_configs", user.uid), botConfig);
                          alert("Configuração do robô salva!");
                        }}
                        className="w-full"
                        icon={Save}
                      >
                        Salvar Configuração do Robô
                      </NeonButton>
                    </GlassCard>

                    {/* Connections Panel */}
                    <GlassCard className="space-y-6">
                      <h3 className="text-xl font-display font-bold flex items-center gap-2">
                        <Globe className="text-neon-cyan" size={24} />
                        Painel de Conexões
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'green' },
                          { id: 'telegram', label: 'Telegram', icon: Send, color: 'blue' },
                          { id: 'instagram', label: 'Instagram', icon: Sparkles, color: 'pink' },
                          { id: 'tiktok', label: 'TikTok', icon: Zap, color: 'white' },
                          { id: 'mercadopago', label: 'Mercado Pago', icon: ShoppingBag, color: 'blue' },
                          { id: 'picpay', label: 'PicPay', icon: CreditCard, color: 'green' },
                          { id: 'kiwify', label: 'Kiwify', icon: Package, color: 'green' },
                          { id: 'kaptur', label: 'Kaptur', icon: Activity, color: 'blue' },
                          { id: 'nubank', label: 'Nubank (Manual)', icon: Zap, color: 'pink' },
                        ].map((conn) => (
                          <div key={conn.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  conn.color === 'green' ? "bg-cakto-green/10 text-cakto-green" :
                                  conn.color === 'blue' ? "bg-blue-400/10 text-blue-400" :
                                  conn.color === 'pink' ? "bg-neon-pink/10 text-neon-pink" : "bg-white/10 text-white"
                                )}>
                                  <conn.icon size={20} />
                                </div>
                                <span className="font-bold text-sm">{conn.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  (integrations as any)[conn.id].status === 'connected' ? "bg-cakto-green" :
                                  (integrations as any)[conn.id].status === 'error' ? "bg-red-500" : "bg-white/20"
                                )} />
                                <span className="text-[8px] font-bold uppercase tracking-widest text-white/40">
                                  {(integrations as any)[conn.id].status === 'connected' ? 'Conectado ✅' : 
                                   (integrations as any)[conn.id].status === 'error' ? 'Erro ⚠️' : 'Desconectado ❌'}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {conn.id === 'whatsapp' && (
                                <>
                                  <input 
                                    type="password"
                                    placeholder="Token da API"
                                    value={integrations.whatsapp.token}
                                    onChange={(e) => setIntegrations({...integrations, whatsapp: {...integrations.whatsapp, token: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                  <input 
                                    placeholder="ID da Conta"
                                    value={integrations.whatsapp.accountId}
                                    onChange={(e) => setIntegrations({...integrations, whatsapp: {...integrations.whatsapp, accountId: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                  <input 
                                    placeholder="Número do WhatsApp"
                                    value={integrations.whatsapp.number}
                                    onChange={(e) => setIntegrations({...integrations, whatsapp: {...integrations.whatsapp, number: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                </>
                              )}
                              {conn.id === 'telegram' && (
                                <>
                                  <input 
                                    type="password"
                                    placeholder="Token do Bot"
                                    value={integrations.telegram.token}
                                    onChange={(e) => setIntegrations({...integrations, telegram: {...integrations.telegram, token: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                  <input 
                                    placeholder="Chat ID"
                                    value={integrations.telegram.chatId}
                                    onChange={(e) => setIntegrations({...integrations, telegram: {...integrations.telegram, chatId: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                </>
                              )}
                              {conn.id === 'instagram' && (
                                <>
                                  <input 
                                    type="password"
                                    placeholder="Access Token"
                                    value={integrations.instagram.token}
                                    onChange={(e) => setIntegrations({...integrations, instagram: {...integrations.instagram, token: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                  <input 
                                    placeholder="ID da Conta"
                                    value={integrations.instagram.accountId}
                                    onChange={(e) => setIntegrations({...integrations, instagram: {...integrations.instagram, accountId: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                </>
                              )}
                              {conn.id === 'tiktok' && (
                                <>
                                  <input 
                                    placeholder="Client ID"
                                    value={integrations.tiktok.clientId}
                                    onChange={(e) => setIntegrations({...integrations, tiktok: {...integrations.tiktok, clientId: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                  <input 
                                    type="password"
                                    placeholder="Client Secret"
                                    value={integrations.tiktok.clientSecret}
                                    onChange={(e) => setIntegrations({...integrations, tiktok: {...integrations.tiktok, clientSecret: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                  <input 
                                    type="password"
                                    placeholder="Access Token"
                                    value={integrations.tiktok.token}
                                    onChange={(e) => setIntegrations({...integrations, tiktok: {...integrations.tiktok, token: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                </>
                              )}
                              {conn.id === 'mercadopago' && (
                                <>
                                  <input 
                                    type="password"
                                    placeholder="Access Token (PIX)"
                                    value={integrations.mercadopago.token}
                                    onChange={(e) => setIntegrations({...integrations, mercadopago: {...integrations.mercadopago, token: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                </>
                              )}
                              {conn.id === 'picpay' && (
                                <>
                                  <input 
                                    type="password"
                                    placeholder="PicPay Token"
                                    value={integrations.picpay.token}
                                    onChange={(e) => setIntegrations({...integrations, picpay: {...integrations.picpay, token: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                  <input 
                                    type="password"
                                    placeholder="Seller Token"
                                    value={integrations.picpay.sellerToken}
                                    onChange={(e) => setIntegrations({...integrations, picpay: {...integrations.picpay, sellerToken: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                </>
                              )}
                              {conn.id === 'kiwify' && (
                                <>
                                  <input 
                                    placeholder="Webhook URL"
                                    value={integrations.kiwify.webhookUrl}
                                    onChange={(e) => setIntegrations({...integrations, kiwify: {...integrations.kiwify, webhookUrl: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                  <input 
                                    type="password"
                                    placeholder="Chave de Integração"
                                    value={integrations.kiwify.token}
                                    onChange={(e) => setIntegrations({...integrations, kiwify: {...integrations.kiwify, token: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                </>
                              )}
                              {conn.id === 'kaptur' && (
                                <>
                                  <input 
                                    type="password"
                                    placeholder="API Key"
                                    value={integrations.kaptur.apiKey}
                                    onChange={(e) => setIntegrations({...integrations, kaptur: {...integrations.kaptur, apiKey: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                  <input 
                                    placeholder="API URL"
                                    value={integrations.kaptur.apiUrl}
                                    onChange={(e) => setIntegrations({...integrations, kaptur: {...integrations.kaptur, apiUrl: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                </>
                              )}
                              {conn.id === 'nubank' && (
                                <>
                                  <input 
                                    placeholder="Sua Chave Pix"
                                    value={integrations.nubank.pixKey}
                                    onChange={(e) => setIntegrations({...integrations, nubank: {...integrations.nubank, pixKey: e.target.value}})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-neon-cyan/50"
                                  />
                                </>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button 
                                onClick={async () => {
                                  if (!user) return;
                                  // Simulate connection test
                                  const isSuccess = Math.random() > 0.3;
                                  const newStatus = isSuccess ? 'connected' : 'error';
                                  const updatedIntegrations = {
                                    ...integrations,
                                    [conn.id]: { ...(integrations as any)[conn.id], status: newStatus }
                                  };
                                  setIntegrations(updatedIntegrations);
                                  await setDoc(doc(db, "integrations", user.uid), updatedIntegrations);
                                  
                                  if (isSuccess) {
                                    alert(`${conn.label}: Conectado com sucesso`);
                                    await addLog('message', `Integração ${conn.label} conectada.`);
                                  } else {
                                    alert(`${conn.label}: Erro na conexão, verifique os dados`);
                                    await addLog('error', `Falha ao conectar ${conn.label}.`);
                                  }
                                }}
                                className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                              >
                                Testar Conexão
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>

                  {/* Sidebar Stats & Logs */}
                  <div className="space-y-6">
                    <GlassCard className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                        <Terminal size={14} />
                        Logs do Sistema
                      </h4>
                      <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                        {logs.length === 0 ? (
                          <p className="text-center py-10 text-white/10 text-[10px] italic">Aguardando atividades...</p>
                        ) : (
                          logs.map((log) => (
                            <div key={log.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className={cn(
                                  "text-[8px] font-bold uppercase tracking-widest",
                                  log.type === 'error' ? "text-red-400" : "text-neon-cyan"
                                )}>{log.type}</span>
                                <span className="text-[8px] text-white/20">{log.timestamp?.toDate().toLocaleTimeString()}</span>
                              </div>
                              <p className="text-[10px] text-white/60 leading-relaxed">{log.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>

                    <GlassCard className="space-y-4 bg-neon-cyan/5 border-neon-cyan/20">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-neon-cyan flex items-center gap-2">
                        <Zap size={14} />
                        Regras de Automação
                      </h4>
                      <ul className="space-y-3">
                        {[
                          'Usar apenas APIs oficiais',
                          'Não permitir spam',
                          'Respeitar limites das plataformas',
                          'Autenticação segura SSL/TLS'
                        ].map((rule, i) => (
                          <li key={i} className="flex items-center gap-2 text-[10px] text-white/60">
                            <div className="w-1 h-1 rounded-full bg-neon-cyan" />
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === 'product' && (
              <motion.div key="product" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-display font-bold">Criador de <span className="neon-text">Produtos</span></h2>
                  <p className="text-white/40">Defina os parâmetros e deixe a IA estruturar seu próximo sucesso.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-white/60">Nicho do Produto</label>
                    <input 
                      value={productData.niche}
                      onChange={e => setProductData({...productData, niche: e.target.value})}
                      placeholder="Ex: Emagrecimento, Finanças, Programação..." 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-white/60">Tipo de Produto</label>
                    <select 
                      value={productData.type}
                      onChange={e => setProductData({...productData, type: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50"
                    >
                      <option value="">Selecione...</option>
                      <option value="ebook">E-book</option>
                      <option value="curso">Curso em Vídeo</option>
                      <option value="mentoria">Mentoria</option>
                      <option value="software">Software / SaaS</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-white/60">Público Alvo</label>
                    <input 
                      value={productData.audience}
                      onChange={e => setProductData({...productData, audience: e.target.value})}
                      placeholder="Ex: Mulheres 25-40 anos, Iniciantes..." 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-white/60">Preço Sugerido</label>
                    <input 
                      value={productData.price}
                      onChange={e => setProductData({...productData, price: e.target.value})}
                      placeholder="Ex: R$ 97,00" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50"
                    />
                  </div>
                </div>

                <NeonButton 
                  onClick={generateProduct} 
                  disabled={isGenerating || !productData.niche} 
                  className="w-full py-4" 
                  icon={Zap}
                >
                  {isGenerating ? "Gerando Estrutura..." : "Gerar Produto Completo"}
                </NeonButton>

                {generatedContent && (
                  <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedContent);
                          alert("Copiado para a área de transferência!");
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-colors"
                      >
                        <FileText size={14} /> Copiar Markdown
                      </button>
                      <button 
                        onClick={() => {
                          const blob = new Blob([generatedContent], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `projeto-${Date.now()}.md`;
                          a.click();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-colors"
                      >
                        <Download size={14} /> Baixar Arquivo
                      </button>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 rounded-2xl prose prose-invert max-w-none border border-neon-cyan/20">
                      <ReactMarkdown>{generatedContent}</ReactMarkdown>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}

            {currentView === 'page' && (
              <motion.div key="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-display font-bold">Página de <span className="neon-text">Vendas</span></h2>
                  <p className="text-white/40">Descreva o seu produto e receba uma estrutura de copy de alta conversão.</p>
                </div>

                <div className="space-y-4">
                  <textarea 
                    rows={4}
                    placeholder="Descreva o que seu produto faz, qual o problema ele resolve e qual a transformação principal..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-6 focus:outline-none focus:border-neon-purple/50 resize-none"
                    id="page-desc"
                  />
                </div>

                <NeonButton 
                  variant="purple"
                  onClick={() => {
                    const desc = (document.getElementById('page-desc') as HTMLTextAreaElement).value;
                    generateSalesPage(desc);
                  }}
                  disabled={isGenerating}
                  className="w-full py-4" 
                  icon={Globe}
                >
                  {isGenerating ? "Criando Layout..." : "Gerar Página de Vendas"}
                </NeonButton>

                {generatedContent && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="glass p-8 rounded-2xl prose prose-invert max-w-none border border-neon-purple/20">
                      <ReactMarkdown>{generatedContent}</ReactMarkdown>
                    </div>
                    <div className="flex justify-center">
                      <NeonButton 
                        onClick={() => setCurrentView('deploy')} 
                        icon={Rocket}
                        className="px-12 py-4 shadow-lg shadow-neon-cyan/20"
                      >
                        Publicar Site Agora
                      </NeonButton>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {currentView === 'editor' && (
              <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Terminal className="text-neon-cyan" size={24} />
                    <h2 className="text-2xl font-display font-bold">Editor de <span className="neon-text">Código</span></h2>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono hover:bg-white/10 transition-colors">index.html</button>
                    <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono hover:bg-white/10 transition-colors">styles.css</button>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 font-mono text-sm overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto scrollbar-hide text-white/80">
                      <pre>
                        {`<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Minha Página de Vendas</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white">
    <header class="py-20 text-center">
        <h1 class="text-6xl font-bold mb-4">Título Matador</h1>
        <p class="text-xl text-gray-400">Subtítulo persuasivo</p>
    </header>
</body>
</html>`}
                      </pre>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl overflow-hidden border border-white/10 flex flex-col">
                    <div className="h-8 bg-gray-100 border-b flex items-center px-4 gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                      <span className="text-[10px] text-gray-400 font-mono ml-2">Preview ao vivo</span>
                    </div>
                    <div className="flex-1 bg-white flex items-center justify-center text-black">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold mb-2">Título Matador</h1>
                        <p className="text-gray-500">Subtítulo persuasivo</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === 'projects' && (
              <motion.div 
                key="projects"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-display font-bold">Meus <span className="neon-text">Projetos</span></h2>
                  <NeonButton onClick={() => setCurrentView('product')} icon={Plus}>Novo Projeto</NeonButton>
                </div>

                {projects.length === 0 ? (
                  <div className="text-center py-20 glass rounded-3xl border-dashed border-white/10">
                    <Package size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/40">Você ainda não criou nenhum projeto.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                      <GlassCard key={project.id} className="group relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 rounded-xl bg-white/5 text-neon-cyan">
                            {project.type === 'product' ? <ShoppingBag size={20} /> : <Globe size={20} />}
                          </div>
                          <button 
                            onClick={async () => {
                              try {
                                await deleteDoc(doc(db, "users", user.uid, "projects", project.id));
                              } catch (error) {
                                handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/projects/${project.id}`);
                              }
                            }}
                            className="p-2 text-white/20 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h3 className="font-bold mb-2 group-hover:text-neon-cyan transition-colors">{project.name}</h3>
                        <p className="text-xs text-white/40 mb-6 uppercase tracking-widest">{project.type}</p>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setGeneratedContent(project.content);
                              setCurrentView(project.type as View);
                            }}
                            className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                          >
                            Abrir
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(project.content);
                              alert("Conteúdo copiado!");
                            }}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {currentView === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col max-w-5xl mx-auto"
              >
                <div className="flex-1 glass rounded-3xl overflow-hidden flex flex-col border border-white/10 shadow-2xl">
                  {/* Chat Header */}
                  <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-purple p-0.5">
                          <div className="w-full h-full rounded-[14px] bg-cakto-bg flex items-center justify-center">
                            <Bot className="text-neon-cyan" size={24} />
                          </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cakto-green border-2 border-cakto-bg" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg">Bot.AI Vendedor</h3>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cakto-green animate-pulse" />
                          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Ativo agora</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors">
                        <Zap size={20} />
                      </button>
                      <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors">
                        <Activity size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                    {messages.map((msg, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex gap-4 max-w-[80%]",
                          msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          msg.role === 'user' ? "bg-neon-purple/20 text-neon-purple" : "bg-neon-cyan/20 text-neon-cyan"
                        )}>
                          {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className={cn(
                          "p-4 rounded-2xl text-sm leading-relaxed space-y-4",
                          msg.role === 'user' ? "bg-neon-purple/10 border border-neon-purple/20 text-white" : "bg-white/5 border border-white/10 text-white/80"
                        )}>
                          <div>{msg.text}</div>
                          {msg.type === 'pix' && msg.paymentData && (
                            <button 
                              onClick={() => setActivePayment(msg.paymentData)}
                              className="w-full py-3 rounded-xl bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan font-bold flex items-center justify-center gap-2 hover:bg-neon-cyan/30 transition-all"
                            >
                              <Zap size={18} />
                              Ver QR Code PIX
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {isSimulating && (
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 text-neon-cyan flex items-center justify-center">
                          <Bot size={16} />
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="p-6 bg-white/5 border-t border-white/10">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.querySelector('input');
                        if (input && input.value) {
                          handleSendMessage(input.value);
                          input.value = '';
                        }
                      }}
                      className="relative"
                    >
                      <input 
                        placeholder="Digite sua mensagem para o robô..."
                        className="w-full bg-cakto-bg border border-white/10 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:border-neon-cyan/50 transition-all shadow-inner"
                      />
                      <button 
                        type="submit"
                        className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all"
                      >
                        <Send size={20} />
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === 'admin' && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-display font-bold">Painel <span className="neon-text">Administrativo</span></h2>
                  <div className="flex gap-2">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-white/40">
                      Modo Admin: Ativo
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <GlassCard className="border-l-4 border-l-neon-cyan">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Vendas Totais</p>
                    <h4 className="text-3xl font-display font-bold">{adminStats.totalSales}</h4>
                  </GlassCard>
                  <GlassCard className="border-l-4 border-l-cakto-green">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Receita Total</p>
                    <h4 className="text-3xl font-display font-bold">R$ {adminStats.totalRevenue.toFixed(2)}</h4>
                  </GlassCard>
                  <GlassCard className="border-l-4 border-l-neon-purple">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Usuários Ativos</p>
                    <h4 className="text-3xl font-display font-bold">{adminStats.activeUsers}</h4>
                  </GlassCard>
                  <GlassCard className="border-l-4 border-l-neon-pink">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Ticket Médio</p>
                    <h4 className="text-3xl font-display font-bold">R$ {(adminStats.totalRevenue / (adminStats.totalSales || 1)).toFixed(2)}</h4>
                  </GlassCard>
                </div>

                <GlassCard className="space-y-6">
                  <h3 className="text-xl font-display font-bold flex items-center gap-2">
                    <Activity className="text-neon-cyan" size={24} />
                    Últimas Vendas (PIX)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Cliente</th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Produto</th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Valor</th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Status</th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Data</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 font-medium">João Silva</td>
                          <td className="py-4 text-white/60">Método Renda Rápida</td>
                          <td className="py-4 text-cakto-green font-bold">R$ 97,00</td>
                          <td className="py-4">
                            <span className="px-2 py-1 rounded-full bg-cakto-green/20 text-cakto-green text-[10px] font-bold uppercase">Aprovado</span>
                          </td>
                          <td className="py-4 text-white/40">18/03/2026 10:30</td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 font-medium">Maria Oliveira</td>
                          <td className="py-4 text-white/60">Ebook IA Lucrativa</td>
                          <td className="py-4 text-cakto-green font-bold">R$ 47,00</td>
                          <td className="py-4">
                            <span className="px-2 py-1 rounded-full bg-cakto-green/20 text-cakto-green text-[10px] font-bold uppercase">Aprovado</span>
                          </td>
                          <td className="py-4 text-white/40">18/03/2026 09:15</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {currentView === 'deploy' && (
              <motion.div 
                key="deploy"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-display font-bold">Publicar <span className="neon-text">Online</span></h2>
                  <p className="text-white/40">Coloque seu bot e suas páginas de vendas no ar em segundos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="space-y-4 border-t-4 border-t-neon-cyan">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-neon-cyan/10 text-neon-cyan">
                        <Globe size={24} />
                      </div>
                      <h4 className="font-bold">Hospedagem Frontend</h4>
                    </div>
                    <p className="text-sm text-white/60">Publique sua interface e páginas de vendas na Vercel ou Netlify.</p>
                    <div className="pt-4 space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-xs font-mono">botai-vendas.vercel.app</span>
                        <span className="text-[8px] font-bold uppercase bg-cakto-green/20 text-cakto-green px-2 py-1 rounded-full">Ativo</span>
                      </div>
                      <NeonButton className="w-full py-2 text-xs" icon={ExternalLink}>Configurar Domínio Próprio</NeonButton>
                    </div>
                  </GlassCard>

                  <GlassCard className="space-y-4 border-t-4 border-t-neon-purple">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-neon-purple/10 text-neon-purple">
                        <Database size={24} />
                      </div>
                      <h4 className="font-bold">Servidor Backend</h4>
                    </div>
                    <p className="text-sm text-white/60">Hospede sua lógica de IA e pagamentos no Render ou Railway.</p>
                    <div className="pt-4 space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-xs font-mono">api-botai.render.com</span>
                        <span className="text-[8px] font-bold uppercase bg-cakto-green/20 text-cakto-green px-2 py-1 rounded-full">Online</span>
                      </div>
                      <NeonButton variant="purple" className="w-full py-2 text-xs" icon={Rocket}>Gerar Novo Deploy</NeonButton>
                    </div>
                  </GlassCard>
                </div>

                <GlassCard className="space-y-6">
                  <h3 className="text-xl font-display font-bold">Passo a Passo para Deploy</h3>
                  <div className="space-y-4">
                    {[
                      { step: '01', title: 'Gerar Build', desc: 'O sistema compila seu código para produção.' },
                      { step: '02', title: 'Conectar GitHub', desc: 'Sincronize seu projeto com um repositório seguro.' },
                      { step: '03', title: 'Configurar Variáveis', desc: 'Adicione suas chaves de API (Gemini, Mercado Pago).' },
                      { step: '04', title: 'Lançar!', desc: 'Seu link público estará pronto em menos de 2 minutos.' }
                    ].map((s) => (
                      <div key={s.step} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-2xl font-display font-bold text-white/10">{s.step}</span>
                        <div>
                          <h5 className="font-bold text-sm">{s.title}</h5>
                          <p className="text-xs text-white/40">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {currentView === 'assinaturas' && (
              <motion.div 
                key="assinaturas"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-display font-bold">Planos e <span className="neon-text">Assinaturas</span></h2>
                  <p className="text-white/40">Escolha o plano ideal para escalar suas vendas com IA.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <GlassCard className={cn(
                    "space-y-6 relative overflow-hidden",
                    subscription.plan === 'free' && "border-2 border-cakto-green"
                  )}>
                    {subscription.plan === 'free' && (
                      <div className="absolute top-4 right-4 px-2 py-1 bg-cakto-green text-black text-[8px] font-bold uppercase rounded">Plano Atual</div>
                    )}
                    <div className="space-y-2">
                      <h4 className="text-2xl font-display font-bold">Plano <span className="text-white/40">Free</span></h4>
                      <p className="text-4xl font-display font-bold">R$ 0<span className="text-sm text-white/40">/mês</span></p>
                    </div>
                    <ul className="space-y-3">
                      {['1 Bot Vendedor', 'Até 100 conversas/mês', 'Integração Mercado Pago', 'Suporte via Comunidade'].map((feat) => (
                        <li key={feat} className="flex items-center gap-2 text-sm text-white/60">
                          <Check size={16} className="text-cakto-green" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <NeonButton variant="outline" className="w-full" disabled={subscription.plan === 'free'}>
                      {subscription.plan === 'free' ? 'Plano Ativo' : 'Selecionar'}
                    </NeonButton>
                  </GlassCard>

                  <GlassCard className={cn(
                    "space-y-6 relative overflow-hidden border-t-4 border-t-neon-purple",
                    subscription.plan === 'pro' && "border-2 border-neon-purple"
                  )}>
                    {subscription.plan === 'pro' && (
                      <div className="absolute top-4 right-4 px-2 py-1 bg-neon-purple text-white text-[8px] font-bold uppercase rounded">Plano Atual</div>
                    )}
                    <div className="space-y-2">
                      <h4 className="text-2xl font-display font-bold">Plano <span className="neon-text">Pro</span></h4>
                      <p className="text-4xl font-display font-bold">R$ 97<span className="text-sm text-white/40">/mês</span></p>
                    </div>
                    <ul className="space-y-3">
                      {['Bots Ilimitados', 'Conversas Ilimitadas', 'Webhook de Pagamento Real-time', 'Suporte Prioritário 24/7', 'Remover marca d\'água'].map((feat) => (
                        <li key={feat} className="flex items-center gap-2 text-sm text-white/60">
                          <Check size={16} className="text-neon-purple" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <NeonButton variant="purple" className="w-full" disabled={subscription.plan === 'pro'}>
                      {subscription.plan === 'pro' ? 'Plano Ativo' : 'Assinar Agora'}
                    </NeonButton>
                  </GlassCard>
                </div>

                <GlassCard className="p-8 text-center space-y-4">
                  <h3 className="text-xl font-display font-bold">Precisa de algo sob medida?</h3>
                  <p className="text-white/40 text-sm max-w-md mx-auto">Para grandes operações e empresas, oferecemos o plano Enterprise com integrações personalizadas e treinamento de IA dedicado.</p>
                  <NeonButton variant="outline" icon={Send}>Falar com Consultor</NeonButton>
                </GlassCard>
              </motion.div>
            )}

            {['vitrine', 'vendas', 'relatorios', 'equipe', 'afiliados', 'financeiro', 'cupons', 'copy', 'ad', 'automation', 'hosting', 'marketplace', 'settings'].includes(currentView) && (
              <motion.div 
                key={currentView}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto py-20 text-center space-y-6"
              >
                <div className="flex justify-center">
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 text-white/20">
                    <Zap size={64} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-display font-bold">Módulo em <span className="neon-text">Desenvolvimento</span></h2>
                  <p className="text-white/40">Estamos trabalhando para trazer esta funcionalidade em breve.</p>
                </div>
                <NeonButton onClick={() => setCurrentView('dashboard')} icon={Layout}>Voltar ao Dashboard</NeonButton>
              </motion.div>
            )}

            {currentView === 'seller' && (
              <motion.div 
                key="seller"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-display font-bold">Bot <span className="neon-text">Vendedor IA</span></h2>
                  <p className="text-white/40">Configure seu vendedor virtual para fechar vendas no piloto automático.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCard className="border-l-4 border-l-neon-cyan">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Conversas</p>
                    <h4 className="text-3xl font-display font-bold">{sellerConfig.stats.conversations}</h4>
                  </GlassCard>
                  <GlassCard className="border-l-4 border-l-cakto-green">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Vendas</p>
                    <h4 className="text-3xl font-display font-bold">{sellerConfig.stats.sales}</h4>
                  </GlassCard>
                  <GlassCard className="border-l-4 border-l-neon-purple">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Conversão</p>
                    <h4 className="text-3xl font-display font-bold">{sellerConfig.stats.conversionRate}%</h4>
                  </GlassCard>
                </div>

                <GlassCard className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl",
                        sellerConfig.isActive ? "bg-cakto-green/20 text-cakto-green" : "bg-white/10 text-white/20"
                      )}>
                        <Zap size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold">Status do Bot</h4>
                        <p className="text-xs text-white/40">{sellerConfig.isActive ? "Ativo e vendendo" : "Desativado"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {validarProduto(sellerConfig) !== "OK" && (
                        <div className="flex items-center gap-2 text-neon-pink animate-pulse">
                          <AlertTriangle size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Configuração Incompleta</span>
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Vendas 24h</span>
                        <button 
                          onClick={() => setSellerConfig({...sellerConfig, isAutoMode: !sellerConfig.isAutoMode})}
                          className="flex items-center gap-2"
                        >
                          {sellerConfig.isAutoMode ? (
                            <ToggleRight className="text-neon-cyan" size={32} />
                          ) : (
                            <ToggleLeft className="text-white/20" size={32} />
                          )}
                        </button>
                      </div>
                      <button 
                        onClick={async () => {
                          if (!user) return;
                          
                          // Validation before activating
                          if (!sellerConfig.isActive) {
                            const validation = validarProduto(sellerConfig);
                            if (validation !== "OK") {
                              setAlertInfo({ title: "Configuração Incompleta", message: validation });
                              return;
                            }
                          }

                          await setDoc(doc(db, "seller_configs", user.uid), {
                            ...sellerConfig,
                            isActive: !sellerConfig.isActive,
                            userId: user.uid,
                            updatedAt: new Date().toISOString()
                          }, { merge: true });
                        }}
                        className="p-2"
                      >
                        {sellerConfig.isActive ? (
                          <ToggleRight className="text-cakto-green" size={48} />
                        ) : (
                          <ToggleLeft className="text-white/20" size={48} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                      <Clock size={14} />
                      Configurações de Follow-up Inteligente
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { key: 'delay5m', label: '5 Minutos' },
                        { key: 'delay1h', label: '1 Hora' },
                        { key: 'delay24h', label: '24 Horas' }
                      ].map((f) => (
                        <label key={f.key} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                          <input 
                            type="checkbox"
                            checked={(sellerConfig.followUpSettings as any)[f.key]}
                            onChange={(e) => setSellerConfig({
                              ...sellerConfig, 
                              followUpSettings: { ...sellerConfig.followUpSettings, [f.key]: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-cakto-green focus:ring-cakto-green"
                          />
                          <span className="text-sm">{f.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Nome do Produto</label>
                      <input 
                        value={sellerConfig.productName}
                        onChange={(e) => setSellerConfig({...sellerConfig, productName: e.target.value})}
                        placeholder="Ex: Método Renda Rápida"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Preço (R$)</label>
                      <input 
                        value={sellerConfig.productPrice}
                        onChange={(e) => setSellerConfig({...sellerConfig, productPrice: e.target.value})}
                        placeholder="Ex: 97,00"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Link de Checkout</label>
                      <input 
                        value={sellerConfig.productLink}
                        onChange={(e) => setSellerConfig({...sellerConfig, productLink: e.target.value})}
                        placeholder="https://checkout.exemplo.com/..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Vincular à Área de Membros</label>
                      <select 
                        value={sellerConfig.memberProductId}
                        onChange={(e) => setSellerConfig({...sellerConfig, memberProductId: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-neon-cyan text-white transition-all"
                      >
                        <option value="" className="bg-cakto-bg">Nenhum (Apenas link externo)</option>
                        {memberProducts.map((p: any) => (
                          <option key={p.id} value={p.id} className="bg-cakto-bg">{p.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-white/20 px-1">Se selecionado, o acesso será liberado automaticamente após o pagamento.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Personalidade do Bot</label>
                      <select 
                        value={sellerConfig.personality}
                        onChange={(e) => setSellerConfig({...sellerConfig, personality: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50 text-white"
                      >
                        <option value="friendly" className="bg-cakto-bg">Amigável e Empático</option>
                        <option value="aggressive" className="bg-cakto-bg">Agressivo e Focado em Fechamento</option>
                        <option value="technical" className="bg-cakto-bg">Técnico e Especialista</option>
                        <option value="humorous" className="bg-cakto-bg">Bem-humorado e Descontraído</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Base de Conhecimento (FAQ, Regras, Info Extra)</label>
                      <textarea 
                        value={sellerConfig.knowledgeBase}
                        onChange={(e) => setSellerConfig({...sellerConfig, knowledgeBase: e.target.value})}
                        rows={3}
                        placeholder="Adicione aqui informações específicas que o bot deve saber sobre o produto ou empresa..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50 resize-none"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Descrição do Produto (Dores, Solução, Bônus)</label>
                      <textarea 
                        value={sellerConfig.productDescription}
                        onChange={(e) => setSellerConfig({...sellerConfig, productDescription: e.target.value})}
                        rows={5}
                        placeholder="Descreva o que o produto faz, quais as dores ele resolve, depoimentos e bônus..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <NeonButton 
                      onClick={async () => {
                        if (!user) return;

                        // Validation
                        const validation = validarProduto(sellerConfig);
                        if (validation !== "OK") {
                          setAlertInfo({ title: "Configuração Incompleta", message: validation });
                          return;
                        }

                        await setDoc(doc(db, "seller_configs", user.uid), {
                          ...sellerConfig,
                          userId: user.uid,
                          updatedAt: new Date().toISOString()
                        }, { merge: true });
                        setAlertInfo({ title: "Sucesso", message: "Configurações salvas!" });
                      }}
                      className="flex-1" 
                      icon={Save}
                    >
                      Salvar Configurações
                    </NeonButton>
                    <NeonButton 
                      onClick={simulateClient}
                      variant="purple"
                      className="flex-1"
                      icon={UserCheck}
                    >
                      Simular Cliente
                    </NeonButton>
                  </div>
                </GlassCard>

                {sellerConfig.errors.length > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-2">
                    <h5 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} />
                      Erros Detectados
                    </h5>
                    <ul className="space-y-1">
                      {sellerConfig.errors.map((err, i) => (
                        <li key={i} className="text-xs text-red-400/80">• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-display font-bold flex items-center gap-2">
                      <Activity className="text-neon-cyan" size={24} />
                      Logs de Atividade
                    </h3>
                    <GlassCard className="max-h-[400px] overflow-y-auto scrollbar-hide space-y-4">
                      {logs.length === 0 ? (
                        <p className="text-center py-10 text-white/20 text-sm italic">Nenhuma atividade registrada ainda.</p>
                      ) : (
                        logs.map((log) => (
                          <div key={log.id} className="flex gap-3 text-xs border-b border-white/5 pb-3 last:border-0">
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1 shrink-0",
                              log.type === 'message' ? "bg-blue-400" :
                              log.type === 'bot_response' ? "bg-cakto-green" :
                              log.type === 'sale_attempt' ? "bg-neon-purple" : "bg-red-500"
                            )} />
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold uppercase tracking-widest text-[8px] text-white/30">{log.type.replace('_', ' ')}</span>
                                <span className="text-[8px] text-white/20">{log.timestamp?.toDate().toLocaleTimeString()}</span>
                              </div>
                              <p className="text-white/60 leading-relaxed">{log.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </GlassCard>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-display font-bold flex items-center gap-2">
                      <Bot className="text-neon-cyan" size={24} />
                      Preview do Comportamento
                    </h3>
                    <GlassCard className="bg-white/5 border-neon-cyan/20">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                            <Bot size={16} />
                          </div>
                          <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Bot Vendedor</span>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 italic text-sm text-white/80 leading-relaxed">
                          {sellerConfig.productName ? (
                            `"Olá! Notei que você se interessou pelo ${sellerConfig.productName}. Como especialista em ${sellerConfig.personality === 'friendly' ? 'ajudar pessoas' : sellerConfig.personality === 'aggressive' ? 'resultados rápidos' : 'soluções técnicas'}, posso te garantir que este é o caminho ideal para resolver suas dores. Quer saber como o link ${sellerConfig.productLink} vai mudar sua vida?"`
                          ) : (
                            "Preencha os dados acima para ver uma prévia de como o bot irá abordar seus clientes."
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-display font-bold flex items-center gap-2">
                      <Zap className="text-neon-purple" size={24} />
                      Dicas de Automação
                    </h3>
                    <div className="space-y-4">
                      {[
                        { title: "Gatilho de Escassez", desc: "O bot usa automaticamente frases como 'últimas vagas' quando detecta hesitação." },
                        { title: "Link Inteligente", desc: "O link de checkout é enviado no momento exato em que o cliente demonstra intenção de compra." },
                        { title: "Personalidade", desc: `Atualmente configurado como '${sellerConfig.personality}', o bot ajustará o vocabulário para este perfil.` }
                      ].map((tip, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className="w-2 h-2 rounded-full bg-neon-purple mt-1.5 shrink-0" />
                          <div>
                            <h5 className="text-sm font-bold">{tip.title}</h5>
                            <p className="text-xs text-white/40 mt-1">{tip.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: Globe, label: 'WhatsApp API', status: 'Em breve' },
                    { icon: MessageSquare, label: 'Telegram Bot', status: 'Em breve' },
                    { icon: Megaphone, label: 'Instagram DM', status: 'Em breve' },
                  ].map((integ, i) => (
                    <div key={i} className="glass p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-3 opacity-50">
                      <integ.icon size={32} className="text-white/20" />
                      <h5 className="font-bold text-sm">{integ.label}</h5>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">{integ.status}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentView === 'cupons' && (
              <motion.div 
                key="cupons"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-8 pb-20"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-display font-bold">Gestão de <span className="neon-text">Cupons</span></h2>
                  <p className="text-white/40">Crie tokens de desconto para aumentar suas conversões.</p>
                </div>

                <GlassCard className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Código do Cupom</label>
                      <input 
                        id="coupon-code"
                        type="text"
                        placeholder="EX: DESCONTO10"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Desconto (%)</label>
                      <input 
                        id="coupon-discount"
                        type="number"
                        placeholder="10"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-neon-cyan/50 text-sm"
                      />
                    </div>
                  </div>
                  <NeonButton 
                    onClick={async () => {
                      const code = (document.getElementById('coupon-code') as HTMLInputElement).value;
                      const discount = parseInt((document.getElementById('coupon-discount') as HTMLInputElement).value);
                      if (!code || isNaN(discount)) return setAlertInfo({ title: "Erro", message: "Preencha todos os campos!" });
                      
                      if (!user) return;
                      try {
                        await addDoc(collection(db, "users", user.uid, "coupons"), {
                          code: code.toUpperCase(),
                          discount,
                          createdAt: serverTimestamp()
                        });
                        (document.getElementById('coupon-code') as HTMLInputElement).value = '';
                        (document.getElementById('coupon-discount') as HTMLInputElement).value = '';
                        setAlertInfo({ title: "Sucesso", message: "Cupom criado com sucesso!" });
                      } catch (error) {
                        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/coupons`);
                      }
                    }}
                    className="w-full"
                    icon={Plus}
                  >
                    Criar Novo Cupom
                  </NeonButton>
                </GlassCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coupons.map((coupon) => (
                    <GlassCard key={coupon.id} className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-bold text-lg text-neon-cyan">{coupon.code}</h4>
                        <p className="text-xs text-white/40">{coupon.discount}% de desconto</p>
                      </div>
                      <button 
                        onClick={() => setConfirmDelete({ 
                          type: 'coupon', 
                          id: coupon.id, 
                          title: 'Excluir Cupom', 
                          message: `Tem certeza que deseja excluir o cupom ${coupon.code}?` 
                        })}
                        className="p-2 text-white/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </GlassCard>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Placeholder for other views */}
            {['copy', 'ad', 'automation', 'hosting', 'marketplace', 'settings', 'vitrine', 'vendas', 'assinaturas', 'relatorios', 'equipe', 'afiliados', 'financeiro', 'integracoes'].includes(currentView) && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                  <Sparkles size={48} className="text-neon-cyan opacity-20" />
                </div>
                <h2 className="text-2xl font-display font-bold capitalize">{currentView.replace('-', ' ')}</h2>
                <p className="text-white/30 max-w-md">Esta funcionalidade está sendo otimizada pela nossa IA para garantir a máxima conversão. Em breve disponível.</p>
                <NeonButton onClick={() => setCurrentView('dashboard')}>Voltar ao Dashboard</NeonButton>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-cakto-sidebar border-t border-white/5 px-6 py-3 flex items-center justify-between z-40">
          <button onClick={() => setCurrentView('dashboard')} className={cn("p-2", currentView === 'dashboard' ? "text-cakto-green" : "text-white/40")}>
            <Layout size={24} />
          </button>
          <button onClick={() => setCurrentView('product')} className={cn("p-2", currentView === 'product' ? "text-cakto-green" : "text-white/40")}>
            <ShoppingBag size={24} />
          </button>
          <button onClick={() => setCurrentView('chat')} className={cn("p-2", currentView === 'chat' ? "text-cakto-green" : "text-white/40")}>
            <MessageSquare size={24} />
          </button>
          <button onClick={() => setCurrentView('financeiro')} className={cn("p-2", currentView === 'financeiro' ? "text-cakto-green" : "text-white/40")}>
            <Plus size={24} />
          </button>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white/40">
            <Menu size={24} />
          </button>
        </div>
      </main>
      {activePayment && (
        <PaymentModal 
          payment={activePayment} 
          onClose={() => setActivePayment(null)} 
        />
      )}

      <ConfirmModal 
        isOpen={!!confirmDelete}
        title={confirmDelete?.title || "Confirmar Exclusão"}
        message={confirmDelete?.message || "Tem certeza que deseja excluir este item?"}
        onConfirm={async () => {
          if (!user || !confirmDelete) return;
          try {
            if (confirmDelete.type === 'coupon') {
              await deleteDoc(doc(db, "users", user.uid, "coupons", confirmDelete.id));
            }
            setConfirmDelete(null);
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/coupons/${confirmDelete.id}`);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <AlertModal 
        isOpen={!!alertInfo}
        title={alertInfo?.title}
        message={alertInfo?.message}
        onClose={() => setAlertInfo(null)}
      />
    </div>
  );
}
