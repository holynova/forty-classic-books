export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const BASE = '/forty-classic-books/';
    if (url.pathname === BASE.slice(0, -1)) {
      url.pathname = BASE;
      return Response.redirect(url, 308);
    }
    if (!url.pathname.startsWith(BASE)) {
      return new Response('Not found', { status: 404 });
    }
    url.pathname = '/' + url.pathname.slice(BASE.length);
    let response = await env.ASSETS.fetch(new Request(url, request));
    if (response.status === 404 && !url.pathname.includes('.') && !url.pathname.endsWith('/')) {
      const htmlUrl = new URL(url);
      htmlUrl.pathname = url.pathname + '.html';
      const htmlResp = await env.ASSETS.fetch(new Request(htmlUrl, request));
      if (htmlResp.status === 200) {
        response = htmlResp;
      }
    }
    const location = response.headers.get('location');
    if (location) {
      const redirect = new URL(location, url);
      if (redirect.origin === url.origin) {
        redirect.pathname = BASE + redirect.pathname.replace(/^\//, '');
        const headers = new Headers(response.headers);
        headers.set('location', redirect.toString());
        return new Response(response.body, { status: response.status, headers });
      }
    }

    if (response.status === 200) {
      const headers = new Headers(response.headers);
      const sub = url.pathname;
      if (sub.startsWith('/covers/') || sub.endsWith('.css') || sub.endsWith('.webp') || sub.endsWith('.jpg') || sub.endsWith('.png') || sub.endsWith('.js') || sub.endsWith('sidebar-nav.html')) {
        headers.set('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
      } else {
        // High-performance caching for HTML: 10 minutes in browser, 24 hours on Cloudflare edge CDN
        headers.set('Cache-Control', 'public, max-age=600, s-maxage=86400, stale-while-revalidate=86400');
      }
      return new Response(response.body, { status: response.status, headers });
    }

    return response;
  }
};
