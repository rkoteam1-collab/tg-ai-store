import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import {StoreProvider} from './context/StoreContext.jsx';
import './index.css';
class AppBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){window.aiShopifyBootComplete?.();}
 render(){return this.state.failed?<main style={{padding:24,fontFamily:'Arial, sans-serif'}}><h1>AIshopify</h1><p role="alert">Не удалось открыть каталог. Попробуйте загрузить приложение заново.</p><button className="primary-button" onClick={()=>{const url=new URL(location.href);url.searchParams.set('reload',String(Date.now()));location.replace(url.href);}}>Перезагрузить</button><p><a href="https://tg-ai-store.onrender.com/?v=20261022.4" target="_blank" rel="noreferrer">Запасной адрес магазина ↗</a></p></main>:this.props.children;}
}
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><AppBoundary><StoreProvider><App/></StoreProvider></AppBoundary></React.StrictMode>);
