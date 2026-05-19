/*
@Name：NS论坛签到_Loon版
@Author：PoetryU
1️⃣使用方法：点击个人头像进入信息页面获取


[Script]
cron "1 8 * * *" script-path=https://raw.githubusercontent.com/PoetryU/Scientist/master/Scripts/NSCheckin_Loon.js, tag=NS🍗签到, img-url=https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/author/ZenMoFeiShi.png, enable=true


hostname = www.nodeseek.com

# 获取 Cookie，需在已登录状态打开个人信息页
http-request ^https:\/\/www\.nodeseek\.com\/api\/account\/getInfo\/\d+\?.*readme=1 script-path=https://raw.githubusercontent.com/PoetryU/Scientist/master/Scripts/NSCheckin_Loon.js, tag=NodeSeek_Cookie


*/
const NAME = 'NodeSeek';
const STORE_KEY = 'NS_NodeseekHeaders';
const ATTENDANCE_URL = 'https://www.nodeseek.com/api/attendance?random=true';
const USER_INFO_RE = /^https:\/\/www\.nodeseek\.com\/api\/account\/getInfo\/\d+\?.*readme=1/;
const NEED_HEADERS = [
  'Connection',
  'Accept-Encoding',
  'Priority',
  'Content-Type',
  'Origin',
  'refract-sign',
  'User-Agent',
  'refract-key',
  'Sec-Fetch-Mode',
  'Cookie',
  'Host',
  'Referer',
  'Accept-Language',
  'Accept',
];

if (typeof $request !== 'undefined') {
  captureHeaders();
} else {
  checkin();
}

function captureHeaders() {
  if (!$request.url || !USER_INFO_RE.test($request.url)) {
    return done();
  }

  const headers = {};
  const source = $request.headers || {};
  for (const key of NEED_HEADERS) {
    const value = getHeader(source, key);
    if (value) headers[key] = value;
  }

  if (!headers.Cookie || !headers['refract-key'] || !headers['refract-sign']) {
    notify('Cookie 获取失败', '缺少 Cookie / refract-key / refract-sign，请在已登录状态重新打开 NodeSeek 个人页。');
    return done();
  }

  headers.Referer = headers.Referer || 'https://www.nodeseek.com/';
  headers.Origin = headers.Origin || 'https://www.nodeseek.com';
  headers.Host = headers.Host || 'www.nodeseek.com';
  headers.Accept = headers.Accept || '*/*';

  if ($persistentStore.write(JSON.stringify(headers), STORE_KEY)) {
    notify('Cookie 获取成功', 'NodeSeek 签到 headers 已保存。');
  } else {
    notify('Cookie 获取失败', 'Loon 持久化写入失败。');
  }
  done();
}

function checkin() {
  const stored = $persistentStore.read(STORE_KEY);
  if (!stored) {
    notify('签到失败', '未找到 NodeSeek headers，请先启用 GetCookie 并打开 NodeSeek 个人页。');
    return done();
  }

  let headers;
  try {
    headers = JSON.parse(stored);
  } catch (error) {
    notify('签到失败', `headers 解析失败：${error.message}`);
    return done();
  }

  const options = {
    url: ATTENDANCE_URL,
    headers: buildRequestHeaders(headers),
    body: '',
    alpn: 'h2',
    'auto-cookie': false,
    'auto-redirect': false,
  };

  $httpClient.post(options, (error, response, body) => {
    if (error) {
      notify('签到失败', String(error));
      return done();
    }

    const rawStatus = response ? response.status || response.statusCode : 0;
    const status = Number(rawStatus) || 'unknown';
    const text = body || '';
    if (status === 403 && /Just a moment|challenge/i.test(text)) {
      notify('Cloudflare 403', 'headers 可能失效，或 Loon 脚本请求指纹仍被拦截；请重新抓取后再试。');
      return done();
    }

    let message = text.slice(0, 180);
    try {
      const data = JSON.parse(text);
      message = data.message || data.msg || JSON.stringify(data);
    } catch (_) {}

    if (status === 403) {
      notify('403 风控', message || text.slice(0, 180));
    } else if (status === 500) {
      notify('500 服务器错误', message || text.slice(0, 180) || '服务器错误');
    } else if (status >= 200 && status < 300) {
      notify('签到成功', message || 'NS 签到成功，但未返回 message');
    } else {
      notify(`请求异常 ${status}`, message || text.slice(0, 180));
    }
    done();
  });
}

function getHeader(headers, key) {
  const target = key.toLowerCase();
  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === target) return headers[name];
  }
  return '';
}

function buildRequestHeaders(savedHeaders) {
  return {
    Connection: savedHeaders.Connection || 'keep-alive',
    'Accept-Encoding': savedHeaders['Accept-Encoding'] || 'gzip, deflate, br',
    Priority: savedHeaders.Priority || 'u=3, i',
    'Content-Type': savedHeaders['Content-Type'] || 'text/plain;charset=UTF-8',
    Origin: savedHeaders.Origin || 'https://www.nodeseek.com',
    'refract-sign': savedHeaders['refract-sign'] || '',
    'User-Agent': savedHeaders['User-Agent'] || 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.2 Mobile/15E148 Safari/604.1',
    'refract-key': savedHeaders['refract-key'] || '',
    'Sec-Fetch-Mode': savedHeaders['Sec-Fetch-Mode'] || 'cors',
    Cookie: savedHeaders.Cookie || '',
    Host: savedHeaders.Host || 'www.nodeseek.com',
    Referer: savedHeaders.Referer || 'https://www.nodeseek.com/sw.js?v=0.3.33',
    'Accept-Language': savedHeaders['Accept-Language'] || 'zh-CN,zh-Hans;q=0.9',
    Accept: savedHeaders.Accept || '*/*',
  };
}

function notify(subtitle, message) {
  $notification.post(NAME, subtitle, message);
}

function done(value = {}) {
  $done(value);
}
