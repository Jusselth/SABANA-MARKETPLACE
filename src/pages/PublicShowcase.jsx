import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// CONFIGURACIÓN UNIFICADA: Se combinan los iconos de ambas ramas (Star, UserCheck, ShieldAlert de uno; MessageSquare del otro)
import { Search, Bell, User, ShoppingCart, Phone, Mail, ExternalLink, X, LogOut, Star, UserCheck, ShieldAlert, MessageSquare } from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import logoSabana from '../assets/sabanalogo.png';
import unisabanalogowhite from '../assets/unisabanalogowhite.png';
import { useCart } from '../context/CartContext'; // Hook del carrito
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const PublicShowcase = () => {
  const navigate = useNavigate();
  const { addToCart, getCartCount } = useCart();
  const { user, isLoggedIn: authIsLoggedIn } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // MANTENIDO: Estados para controlar el modal flotante del primer mensaje (Rama: chat)
  const [showContactModal, setShowContactModal] = useState(false);
  const [firstMessage, setFirstMessage] = useState("");
  const { unreadCount } = useNotifications();

  const apiUrl = import.meta.env.VITE_API_URL;

  const CATEGORY_LABELS = {
    'ACADEMIC_SUPPLIES': 'Útiles académicos',
    'BOOKS': 'Libros',
    'ELECTRONICS': 'Electrónica',
    'CLOTHING': 'Ropa',
    'FOOD': 'Comida',
    'SERVICES': 'Servicios',
    'OTHER': 'Otros',
  };

  const hasMyOwnProducts = useMemo(() => {
    // 1. Priorizamos el user del contexto
    // 2. Si es null, buscamos en el localStorage directamente
    const savedUser = localStorage.getItem('user');
    const userEmail = (user?.email || (savedUser ? JSON.parse(savedUser).email : null))?.toLowerCase().trim();

    if (!userEmail || !products || products.length === 0) return false;

    return products.some(product =>
      product.ownerEmail &&
      product.ownerEmail.toLowerCase().trim() === userEmail
    );
  }, [products, user]); // Al incluir 'user', esto se recalculará cuando el contexto cargue
  // Fetch de productos reales desde el Backend
  useEffect(() => {
    let isMounted = true;
    const fetchAllProducts = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/products`);
        if (!response.ok) throw new Error('Error en la red');
        const dbProducts = await response.json();
        const validatedDbProducts = Array.isArray(dbProducts) ? dbProducts : [];

        if (isMounted) {
          setProducts(validatedDbProducts);
        }
      } catch (error) {
        console.error("Error al cargar productos desde la BD:", error);
        if (isMounted) {
          setProducts([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllProducts();
    return () => { isMounted = false; };
  }, [apiUrl]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch =
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "ALL" || product.category === selectedCategory;

      const isNotMine = !user || !user.email || !product.ownerEmail ||
        product.ownerEmail.toLowerCase() !== user.email.toLowerCase();

      const hasStock = product.stock > 0;

      return matchesSearch && matchesCategory && isNotMine && hasStock;
    });
  }, [products, searchTerm, selectedCategory, user]);

  const sortedPopular = useMemo(() => {
    if (filteredProducts.length === 0) return [];
    const totalStock = filteredProducts.reduce((acc, prod) => acc + (prod.stock || 0), 0);
    const averageStock = totalStock / filteredProducts.length;

    return filteredProducts
      .filter(product => (product.stock || 0) < averageStock)
      .sort((a, b) => (b.stock || 0) - (a.stock || 0))
      .slice(0, 4);
  }, [filteredProducts]);

  const formatCurrency = useCallback((value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    window.location.reload();
  };

  const isLoggedIn = authIsLoggedIn || localStorage.getItem('isLoggedIn') === 'true';
  const userData = useMemo(() => {
    if (user) return user;
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  }, [user]);
  const currentUserId = user?.id ?? userData?.id ?? localStorage.getItem('userId');
  const currentUserEmail = user?.email ?? userData?.email ?? localStorage.getItem('userEmail');

  const checkIfOwner = useCallback((product) => {
    if (!product) return false;

    // Validación cruzada estricta por Email u ID
    if (currentUserEmail && product.ownerEmail && product.ownerEmail.toLowerCase() === currentUserEmail.toLowerCase()) {
      return true;
    }
    if (currentUserId) {
      const sellerId = product.user?.id || product.sellerId || product.userId || product.user_id;
      if (sellerId && Number(sellerId) === Number(currentUserId)) return true;
    }
    return false;
  }, [currentUserId, currentUserEmail]);

  const handleAddToCartClick = (e, product) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      alert("¡Hola! Para añadir productos al carrito debes iniciar sesión con tu cuenta Sabana.");
      navigate('/login');
      return;
    }

    addToCart(product);
  };

  // MANTENIDO: Validación y redirección del botón de Chat del Navbar (Rama: chat)
  const handleChatNavigation = () => {
    if (!isLoggedIn) {
      alert("¡Hola! Para ver tus chats debes iniciar sesión con tu cuenta Sabana.");
      navigate('/login');
      return;
    }
    navigate('/chat');
  };

  // MANTENIDO: Lógica para registrar el primer mensaje en LocalStorage (Rama: chat)
  const handleSendFirstMessage = (e) => {
    e.preventDefault();
    if (!firstMessage.trim()) return;

    if (!isLoggedIn) {
      alert("¡Hola! Debes iniciar sesión con tu cuenta Sabana para enviar mensajes.");
      navigate('/login');
      return;
    }

    const sellerEmail = selectedProduct.ownerEmail || "";
    const sellerId = selectedProduct.user?.id || selectedProduct.sellerId || selectedProduct.userId || "";

    const localChats = JSON.parse(localStorage.getItem('mock_chats') || '[]');
    const chatId = `chat_${Date.now()}`;

    const newChatRoom = {
      id: chatId,
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      productImage: selectedProduct.imageUrl,
      buyerId: currentUserId || 'comprador_anon',
      buyerEmail: currentUserEmail || '',
      sellerId: sellerId,
      sellerEmail: sellerEmail,
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderId: currentUserId || 'comprador_anon',
          senderEmail: currentUserEmail || '',
          text: firstMessage,
          timestamp: new Date().toISOString()
        }
      ]
    };

    localChats.push(newChatRoom);
    localStorage.setItem('mock_chats', JSON.stringify(localChats));

    alert(`¡Mensaje enviado con éxito al vendedor! Podrás seguir respondiendo desde el botón de chats en el menú superior.`);
    setFirstMessage("");
    setShowContactModal(false);
    setSelectedProduct(null); // Cierra de igual forma el detalle del producto de manera limpia
  };

  // Componente Modal de Detalle de Producto Unificado
  const ProductModal = ({ product, onClose }) => {
    if (!product) return null;

    const isOwner = checkIfOwner(product);

    // Estados locales para almacenar la info asincrónica del vendedor y sus reseñas
    const [sellerStats, setSellerStats] = useState({ fullName: "Cargando...", totalSales: 0 });
    const [reviewData, setReviewData] = useState({ reviews: [], count: 0, average: null });
    const [loadingMetadata, setLoadingMetadata] = useState(true);

    useEffect(() => {
      if (!product.ownerEmail) return;

      const fetchMetadata = async () => {
        try {
          // 1. Traer estadísticas del vendedor
          const statsRes = await fetch(`${apiUrl}/api/v1/reviews/seller-stats/${product.ownerEmail}`);
          const statsData = statsRes.ok ? await statsRes.json() : { fullName: "Miembro Sabana", totalSales: 0 };

          // 2. Traer reseñas del producto
          const reviewRes = await fetch(`${apiUrl}/api/v1/reviews/product/${product.id}`);
          const revData = reviewRes.ok ? await reviewRes.json() : { reviews: [], count: 0, average: null };

          setSellerStats(statsData);
          setReviewData(revData);
        } catch (error) {
          console.error("Error al recopilar metadatos de reseñas:", error);
        } finally {
          setLoadingMetadata(false);
        }
      };

      fetchMetadata();
    }, [product]);

    return (

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-sabana-blue/40 backdrop-blur-md" onClick={onClose} />

        {/* Contenedor adaptado con scroll vertical global interno para el modal */}
        <div className="relative bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in duration-300">

          <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-white/80 p-2 rounded-full text-sabana-blue hover:bg-sabana-blue hover:text-white transition-all shadow-md">
            <X size={20} />
          </button>

          {/* LADO IZQUIERDO: Imagen Fija */}
          <div className="md:w-3/4 h-64 md:h-auto bg-sabana-light md:sticky md:top-0">
            <img
              src={product.imageUrl || logoSabana}
              alt={product.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = logoSabana; }}
            />
          </div>

          {/* LADO DERECHO: Toda la información con scroll natural hacia abajo */}
          <div className="p-8 md:w-1/2 flex flex-col space-y-6">
            <div>
              <div className="flex gap-2 mb-3">
                <span className="text-[10px] font-bold bg-sabana-softGold/10 text-sabana-blue-light px-2 py-1 rounded-md uppercase">
                  {CATEGORY_LABELS[product.category] || product.category || 'Otros'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${product.condition === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                  {product.condition === 'NEW' ? 'Nuevo' : 'Usado'}
                </span>
              </div>

              <h2 className="text-2xl font-black text-sabana-blue mb-3">{product.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {product.description || "Este producto es ofrecido por un miembro de la comunidad Sabana."}
              </p>
            </div>

            {/* UNIFICACIÓN DE BLOQUE COMERCIAL: Mantiene el diseño estético agregando el botón de "Contactar" de tu rama */}
            <div className="bg-slate-50/80 border border-gray-100 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Precio</p>
                  <p className="text-2xl font-black text-sabana-blue">{formatCurrency(product.price)}</p>
                </div>

                {/* Agregado: Botón de contactar dinámico para iniciar chat */}
                {!isOwner && (
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        alert("¡Hola! Para contactar al vendedor debes iniciar sesión con tu cuenta Sabana.");
                        navigate('/login');
                        return;
                      }
                      setShowContactModal(true);
                    }}
                    className="bg-transparent border border-sabana-blue text-sabana-blue px-4 py-2 rounded-xl font-bold hover:bg-sabana-light transition-all text-sm"
                  >
                    Contactar
                  </button>
                )}
              </div>

              <button
                onClick={(e) => handleAddToCartClick(e, product)}
                className={`w-full py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${isOwner
                  ? "bg-gray-400 text-white cursor-not-allowed opacity-80 shadow-none"
                  : "bg-sabana-blue text-white hover:bg-sabana-blue-hover"
                  }`}
                disabled={isOwner}
              >
                <ShoppingCart size={18} />
                {isOwner ? 'Tu Propio Producto' : 'Añadir al Carrito'}
              </button>
            </div>

            {/* SECCIÓN COMPAÑERO: Información Comercial del Vendedor */}
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <h3 className="text-xs font-black text-sabana-blue uppercase tracking-widest flex items-center gap-1.5">
                <UserCheck size={16} className="text-sabana-blue-light" /> Información del Vendedor
              </h3>

              <div className="bg-sabana-light/50 p-4 rounded-2xl border border-sabana-blue/5">
                <p className="text-sm font-bold text-sabana-blue">{sellerStats.fullName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ventas concretadas en campus: <span className="font-extrabold text-sabana-blue">{sellerStats.totalSales}</span>
                </p>
              </div>
            </div>

            {/* SECCIÓN COMPAÑERO: Calificaciones y Reseñas con Scroll */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div className="flex justify-between items-baseline">
                <h3 className="text-xs font-black text-sabana-blue uppercase tracking-widest">
                  Opiniones del Producto
                </h3>
                <span className="text-[10px] text-gray-400 font-bold">({reviewData.count} reseñas)</span>
              </div>

              {loadingMetadata ? (
                <p className="text-xs text-gray-400 italic">Cargando reputación...</p>
              ) : (
                <>
                  {reviewData.count < 10 ? (
                    <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/60 p-4 rounded-2xl">
                      <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-md">
                          Comprador Nuevo
                        </span>
                        <p className="text-xs text-amber-900 font-medium mt-1.5 leading-snug">
                          Este vendedor aún no acumula las 10 calificaciones requeridas para calcular un promedio oficial en el campus.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                      <div className="bg-white px-3 py-2 rounded-xl border border-emerald-100 text-center shadow-xs">
                        <span className="text-2xl font-black text-slate-800">{reviewData.average}</span>
                        <span className="text-[10px] text-gray-400 font-bold block">de 5</span>
                      </div>
                      <div>
                        <div className="flex gap-0.5 text-sabana-softGold">
                          {Array(5).fill(0).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < Math.round(Number(reviewData.average)) ? 'fill-sabana-softGold text-sabana-softGold' : 'text-gray-200'}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 font-medium">Promedio calculado sobre {reviewData.count} transacciones.</p>
                      </div>
                    </div>
                  )}

                  {/* Listado de comentarios */}
                  <div className="space-y-3 mt-2">
                    {reviewData.reviews.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2 text-center bg-slate-50 rounded-xl border border-dashed border-gray-100">
                        Aún no hay comentarios escritos sobre este artículo.
                      </p>
                    ) : (
                      reviewData.reviews.map((rev) => (
                        <div key={rev.id} className="border-b border-gray-50 pb-3 last:border-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-sabana-blue/60">{rev.buyerEmail?.split('@')[0]}</span>
                            <div className="flex text-sabana-softGold">
                              {Array(5).fill(0).map((_, i) => (
                                <Star key={i} size={10} className={i < rev.rating ? 'fill-sabana-softGold' : 'text-gray-200'} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 bg-slate-50/50 p-2.5 rounded-xl border border-gray-100/40">
                            {rev.comment}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-sabana-light font-sans antialiased">
      {/* NAVBAR */}
      <header className="bg-sabana-blue px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl shadow-sm">
            <img src={logoSabana} alt="Logo Sabana" className="h-8 w-auto object-contain" />
          </div>
          <span className="hidden lg:block text-white font-bold tracking-tight">Marketplace Unisabana</span>
        </div>

        <div className="flex-1 max-w-3xl mx-8 flex gap-3">
          <div className="relative hidden md:block group">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-white/10 hover:bg-white/20 text-white border-none rounded-2xl pl-4 pr-10 py-3 text-xs font-bold focus:bg-white focus:text-sabana-blue outline-none cursor-pointer transition-all duration-300 min-w-[160px] shadow-sm"
            >
              <option value="ALL">Todas las categorías</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key} className="text-sabana-blue">
                  {label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/60 group-hover:text-white transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          <div className="relative group flex-1">
            <input
              type="text"
              placeholder="¿Qué estás buscando hoy?"
              className="w-full py-2.5 px-12 rounded-2xl bg-white/10 text-white placeholder:text-white/60 hover:bg-white/20 focus:bg-white focus:text-sabana-blue focus:outline-none transition-all duration-300 shadow-inner text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-2.5 text-white/50 group-hover:text-white/80 group-focus-within:text-sabana-blue w-5 h-5 transition-colors duration-300" />

            {(searchTerm || selectedCategory !== "ALL") && (
              <button
                onClick={() => { setSearchTerm(""); setSelectedCategory("ALL"); }}
                className="absolute right-4 top-2.5 p-1 rounded-full text-white/50 hover:text-red-400 group-focus-within:text-sabana-blue/40 group-focus-within:hover:text-red-500 transition-all duration-200 z-10"
                title="Limpiar búsqueda"
              >
                <X size={18} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5 text-white">
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-2xl text-slate-600 transition-all active:scale-95 group"
            title="Mis Notificaciones"
          >
            <Bell size={20} className="group-hover:rotate-12 transition-transform" />


            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-pulse border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* MANTENIDO: Botón de chats en el Navbar */}
          <div
            onClick={handleChatNavigation}
            className="relative cursor-pointer group"
            title="Mis Chats / Mensajes"
          >
            <MessageSquare size={22} className="group-hover:text-sabana-softGold transition-colors" />
          </div>

          <div onClick={() => navigate('/cart')} className="relative cursor-pointer group">
            <ShoppingCart size={22} className="group-hover:text-sabana-softGold transition-colors" />
            {getCartCount() > 0 && (
              <span className="absolute -top-2 -right-2 bg-sabana-softGold text-sabana-blue text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-sabana-blue animate-in zoom-in duration-200">
                {getCartCount()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 border-l border-white/20 pl-5">
            <div className="flex flex-col gap-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (isLoggedIn || userData) {
                    navigate('/userprofile');
                  } else {
                    navigate('/login');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isLoggedIn || userData) navigate('/userprofile');
                    else navigate('/login');
                  }
                }}
                className="flex items-center gap-2 text-white group cursor-pointer hover:text-sabana-softGold transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <User size={18} />
                </div>
                <span className="hidden sm:block text-xs font-bold uppercase tracking-wider">
                  {isLoggedIn ? 'Mi Perfil' : 'Mi Cuenta'}
                </span>
              </div>

              {isLoggedIn && userData?.name && (
                <span className="text-[10px] font-medium text-sabana-softGold/80 italic lowercase leading-none text-center mt-0.5">
                  {userData.name}
                </span>
              )}
            </div>

            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="ml-2 p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all duration-300 self-center"
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <img
          src="https://uvirtual.unisabana.edu.co/images/nuestra_universidad_la_sabana_675w.webp"
          alt="Campus La Sabana"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sabana-blue/90 to-transparent"></div>
        <div className="relative z-10 container mx-auto px-10 flex flex-col items-start">
          <img src={unisabanalogowhite} alt="Universidad de La Sabana" className="h-20 mb-6 drop-shadow-lg" />
          <h1 className="text-4xl md:text-5xl font-bold text-white max-w-xl leading-tight">
            El mercado oficial de la comunidad <span className="text-sabana-softGold">Sabana</span>
          </h1>
          <p className="text-white/80 mt-4 text-lg max-w-md">Compra y vende artículos de forma segura dentro de tu campus universitario.</p>
        </div>
      </section>

      <main className="container mx-auto px-6 py-16">
        {hasMyOwnProducts && (
          <button
            onClick={() => navigate('/PersonalInventory')}
            className="mb-3 inline-flex items-center gap-2 px-4 py-1.5 bg-sabana-blue-light/10 border border-sabana-blue-light/300 text-sabana-blue-light text-xs font-black uppercase tracking-widest rounded-full cursor-pointer hover:bg-sabana-softGold/20 hover:scale-[1.02] active:scale-[0.98] transition-all group duration-200"
            title="Ir a gestionar mis publicaciones"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sabana-blue-light animate-pulse"></span>
            Tienes productos publicados en el Marketplace
            <span className="transform group-hover:translate-x-1 transition-transform inline-block ml-1 font-bold">
              →
            </span>
          </button>
        )}
        {/* SECCIÓN MÁS POPULARES */}
        {sortedPopular.length > 0 && (
          <section className="mb-20 animate-in fade-in duration-500">

            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-sabana-blue tracking-tight">Más populares en el campus</h2>
                <p className="text-gray-500 mt-1 text-sm">Los artículos con mayor disponibilidad hoy.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {sortedPopular.map((product) => {
                const isOwner = checkIfOwner(product);
                return (
                  <div
                    key={`popular-${product.id}`}
                    onClick={() => setSelectedProduct(product)}
                    className="group bg-white rounded-3xl p-4 shadow-sm hover:shadow-2xl transition-all duration-500 border border-transparent hover:border-sabana-softGold/20 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-sabana-light">
                        <img
                          src={product.imageUrl || logoSabana}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          onError={(e) => { e.target.src = logoSabana; }}
                        />
                        <div className="absolute top-3 right-3 bg-sabana-softGold text-sabana-blue text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
                          TENDENCIA
                        </div>
                      </div>
                      <div className="px-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-sabana-blue-light uppercase tracking-widest">
                            {CATEGORY_LABELS[product.category] || product.category || 'Otros'}
                          </span>
                          <span className={`text-[10px] font-bold uppercase transition-all ${product.stock === 1 ? 'text-red-500 animate-pulse bg-red-50 px-2 py-0.5 rounded-md' : 'text-gray-400'}`}>
                            {product.stock === 1 ? '¡Última unidad!' : `${product.stock || 0} disp.`}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-sabana-blue mt-1 line-clamp-1">{product.title}</h3>
                      </div>
                    </div>

                    <div className="px-2 mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-sabana-blue">{formatCurrency(product.price)}</p>
                        <div
                          onClick={(e) => handleAddToCartClick(e, product)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${isOwner
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-sabana-light text-sabana-blue hover:bg-sabana-blue hover:text-white"
                            }`}
                        >
                          <ShoppingCart size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TODOS LOS PRODUCTOS */}
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold text-sabana-blue tracking-tight">Explorar Productos</h2>
          <div className="h-1 flex-1 mx-8 bg-sabana-blue/5 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 animate-pulse rounded-3xl" />
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const isOwner = checkIfOwner(product);
              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="group bg-white rounded-3xl p-4 shadow-sm hover:shadow-2xl transition-all cursor-pointer border border-transparent hover:border-sabana-softGold/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-sabana-light">
                      <img
                        src={product.imageUrl || logoSabana}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => { e.target.src = logoSabana; }}
                      />
                    </div>
                    <div className="px-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-sabana-blue-light uppercase tracking-widest">
                          {CATEGORY_LABELS[product.category] || product.category || 'Otros'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase transition-all ${product.stock === 1 ? 'text-red-500 animate-pulse bg-red-50 px-2 py-0.5 rounded-md' : 'text-gray-400'
                          }`}>
                          {product.stock === 1 ? '¡Última unidad!' : `${product.stock || 0} disp.`}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-sabana-blue mt-1 line-clamp-1">{product.title}</h3>
                    </div>
                  </div>

                  <div className="px-2 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-sabana-blue">{formatCurrency(product.price)}</p>
                      <div
                        onClick={(e) => handleAddToCartClick(e, product)}
                        className={`p-2 rounded-xl transition-colors ${isOwner
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-sabana-light text-sabana-blue hover:bg-sabana-blue hover:text-white"
                          }`}
                      >
                        <ShoppingCart size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[40px] shadow-sm border border-dashed border-gray-200 animate-in fade-in zoom-in duration-500">
              <div className="bg-sabana-light p-6 rounded-full mb-6">
                <Search size={48} className="text-sabana-blue/20" />
              </div>
              <h3 className="text-2xl font-bold text-sabana-blue mb-2">No encontramos nada...</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8 px-6">
                No hay productos que coincidan con tu búsqueda actual "<span className="font-bold text-sabana-blue-light">{searchTerm}</span>"
                {selectedCategory !== "ALL" && ` en la categoría ${CATEGORY_LABELS[selectedCategory]}`}.
              </p>
              <button
                onClick={() => { setSearchTerm(""); setSelectedCategory("ALL"); }}
                className="bg-sabana-blue text-white px-8 py-3 rounded-2xl font-bold hover:bg-sabana-blue-hover transition-all active:scale-95 shadow-lg shadow-sabana-blue/20"
              >
                Ver todos los productos
              </button>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-sabana-blue text-white pt-20 pb-10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 border-b border-white/10 pb-16">
            <div className="col-span-1">
              <img src={logoSabana} alt="Logo" className="h-12 bg-white p-2 rounded-xl mb-6" />
              <p className="text-white/60 text-sm leading-relaxed">
                El punto de encuentro oficial para el comercio seguro dentro del campus de la Universidad de La Sabana.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-sabana-softGold uppercase tracking-widest text-xs">Marketplace</h4>
              <ul className="space-y-4 text-sm text-white/80">
                <li className="hover:text-sabana-softGold cursor-pointer transition-colors">Todos los productos</li>
                <li className="hover:text-sabana-softGold cursor-pointer transition-colors">Publicar artículo</li>
                <li className="hover:text-sabana-softGold cursor-pointer transition-colors">Términos y condiciones</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-sabana-softGold uppercase tracking-widest text-xs">Universidad</h4>
              <ul className="space-y-4 text-sm text-white/80">
                <li className="flex items-center gap-2 hover:text-sabana-softGold cursor-pointer transition-colors">
                  Campus Chía <ExternalLink size={14} />
                </li>
                <li className="hover:text-sabana-softGold cursor-pointer transition-colors">Directorio Estudiantil</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-sabana-softGold uppercase tracking-widest text-xs">Contacto Directo</h4>
              <div className="flex gap-4 mb-6">
                {[FaInstagram, Phone, Mail].map((Icon, idx) => (
                  <div key={idx} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-sabana-softGold hover:text-sabana-blue transition-all cursor-pointer">
                    <Icon size={20} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/40 font-bold">© 2026 Universidad de La Sabana</p>
            </div>
          </div>
          <div className="text-center text-[10px] text-white/20 font-bold uppercase tracking-[0.3em]">
            Personas que inspiran personas - Marketplace
          </div>
        </div>
      </footer>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />

      {/* MANTENIDO: Formulario submodal flotante para la redacción del mensaje inicial */}
      {showContactModal && selectedProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContactModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-sabana-blue transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-sabana-blue mb-1">Enviar Mensaje de Interés</h3>
            <p className="text-xs text-gray-500 mb-4">
              Inicia una conversación por el producto: <span className="font-bold text-sabana-blue-light">{selectedProduct.title}</span>
            </p>
            <form onSubmit={handleSendFirstMessage} className="space-y-4">
              <textarea
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                placeholder="Ej: ¡Hola! Me interesa bastante el artículo. ¿En qué lugar de la universidad nos podríamos ver hoy?"
                className="w-full h-32 p-3 text-sm rounded-xl border border-gray-200 focus:border-sabana-blue focus:outline-none resize-none"
                required
              />
              <button
                type="submit"
                className="w-full py-3 bg-sabana-blue text-white font-bold rounded-xl text-sm hover:bg-sabana-blue-hover transition-all uppercase tracking-wider"
              >
                Enviar Mensaje Inicial
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicShowcase;