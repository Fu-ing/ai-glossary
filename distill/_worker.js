export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // POST /api/event - 接收统计事件
    if (url.pathname === '/api/event' && request.method === 'POST') {
      const { event } = await request.json();
      if (!event) return new Response('missing event', { status: 400, headers: cors });

      const key = `stat_${event}`;
      const current = await env.STATS.get(key);
      const count = (parseInt(current) || 0) + 1;
      await env.STATS.put(key, count.toString());

      return new Response(JSON.stringify({ ok: true, event, count }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/deep-register - 收集深度版微信号
    if (url.pathname === '/api/deep-register' && request.method === 'POST') {
      const { wechat } = await request.json();
      if (!wechat) return new Response('missing wechat', { status: 400, headers: cors });

      const ts = Date.now();
      await env.STATS.put(`deep_reg_${ts}`, wechat);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // GET /api/deep-registrations - 查看所有微信号登记（你私用，别公开分享这个URL）
    if (url.pathname === '/api/deep-registrations' && request.method === 'GET') {
      const list = await env.STATS.list({ prefix: 'deep_reg_' });
      const result = [];
      for (const key of list.keys) {
        const wechat = await env.STATS.get(key.name);
        const ts = parseInt(key.name.replace('deep_reg_', ''));
        result.push({ time: new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }), wechat });
      }
      result.sort((a, b) => b.time.localeCompare(a.time));
      return new Response(JSON.stringify(result, null, 2), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // GET /api/stats - 获取统计数据
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const keys = ['stat_page_view', 'stat_quiz_start', 'stat_quiz_complete', 'stat_share_click', 'stat_return_visit'];
      const result = {};
      for (const k of keys) {
        result[k] = parseInt(await env.STATS.get(k)) || 0;
      }
      return new Response(JSON.stringify(result), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // 其他请求交给 Pages 静态资源
    return env.ASSETS.fetch(request);
  }
};
