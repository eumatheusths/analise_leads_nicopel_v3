import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
    const { cookies, url, redirect } = context;
    
    // Lista de páginas públicas (que não precisam de login)
    const publicRoutes = ['/login', '/cadastro'];
    
    // Tenta pegar o cookie de acesso
    const hasAccess = cookies.has('nicopel_session');
    
    // Se NÃO tem acesso e NÃO está numa página pública, manda pro login
    if (!hasAccess && !publicRoutes.includes(url.pathname)) {
        return redirect('/login');
    }

    // Se JÁ tem acesso e tenta entrar no login, manda pro dashboard
    if (hasAccess && publicRoutes.includes(url.pathname)) {
        return redirect('/');
    }

    return next();
});