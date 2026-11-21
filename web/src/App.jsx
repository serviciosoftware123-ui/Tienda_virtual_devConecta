import { HashRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { DEMO } from './lib/api.js';

// En la demo publicada la URL no puede cambiar, así que la navegación vive en memoria.
const Router = DEMO ? MemoryRouter : HashRouter;
import { StoreProvider } from './state/store.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderDone from './pages/OrderDone.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Account from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';
import { Help, Contact, Policy, About, Track, NotFound } from './pages/Support.jsx';

const L = (el) => <Layout>{el}</Layout>;

export default function App() {
  return (
    <Router>
      <StoreProvider>
        <Routes>
          <Route path="/" element={L(<Home />)} />
          <Route path="/catalogo" element={L(<Catalog />)} />
          <Route path="/producto/:slug" element={L(<Product />)} />
          <Route path="/carrito" element={L(<Cart />)} />
          <Route path="/pago" element={<Checkout />} />
          <Route path="/pedido/:folio" element={L(<OrderDone />)} />
          <Route path="/entrar" element={L(<Login />)} />
          <Route path="/registro" element={L(<Register />)} />
          <Route path="/cuenta/*" element={L(<Account />)} />
          <Route path="/admin" element={L(<Admin />)} />
          <Route path="/ayuda" element={L(<Help />)} />
          <Route path="/contacto" element={L(<Contact />)} />
          <Route path="/politicas/:slug" element={L(<Policy />)} />
          <Route path="/nosotros" element={L(<About />)} />
          <Route path="/rastrear" element={L(<Track />)} />
          <Route path="*" element={L(<NotFound />)} />
        </Routes>
      </StoreProvider>
    </Router>
  );
}
