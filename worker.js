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
    const location = response.headers.get('location');
    if (location) {
      const redirect = new URL(location, url);
      if (redirect.origin === url.origin) {
        redirect.pathname = BASE + redirect.pathname.replace(/^\//, '');
        const headers = new Headers(response.headers);
        headers.set('location', redirect.toString());
        response = new Response(response.body, { status: response.status, headers });
      }
    }
    return response;
  }
};
