const TITLE = '支付宝';

const POINT_URL = 'alipays://platformapi/startapp?appId=20000160&url=/www/pointSignIn.html';
const FAMILY_POINT_URL = 'alipays://platformapi/startapp?appId=2019052365379124';
const ANT_FOREST_URL = 'alipay://platformapi/startapp?appId=60000002';

const waitFamily = readSeconds('Alipay_wait_family', 5) * 1000;
const waitForest = readSeconds('Alipay_wait_mayi', 5) * 1000;

notify('领积分啦', POINT_URL, 0);
notify('领家庭积分啦', FAMILY_POINT_URL, waitFamily);
notify('收能量啦', ANT_FOREST_URL, waitFamily + waitForest);

$done();

function readSeconds(key, fallback) {
  const raw = $persistentStore.read(key);
  if (raw === null || raw === undefined || raw === '') return fallback;

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function notify(message, url, delay) {
  $notification.post(TITLE, '', message, { openUrl: url }, delay);
}
