import https from 'node:https';

const url = process.argv[2];
const COUNT = 10;
const TIMEOUT_MS = 30_000;

// Настройки запроса. timeout — сколько ждать, если по соединению не приходят данные.
const REQUEST_OPTIONS = {
  headers: { 'User-Agent': 'node' },
  timeout: TIMEOUT_MS,
};

function checkUrl(value) {
  if (!value) {
    throw new Error('не указан URL адрес');
  }
  if (!URL.canParse(value)) {
    throw new Error(`некорректный адрес: ${value}`);
  }
  if (new URL(value).protocol !== 'https:') {
    throw new Error(`поддерживается только https: ${value}`);
  }
}

function download(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, REQUEST_OPTIONS, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`сервер ответил ${res.statusCode}`));
        return;
      }

      let bytes = 0;
      res.on('data', (d) => (bytes += d.length));
      // Обрыв соединения посреди скачивания.
      res.on('error', () => {
        reject(new Error(`соединение оборвалось, получено ${bytes} байт`));
      });
      res.on('end', () => resolve(bytes));
    });

    // Опция timeout только сообщает о простое, прерывать запрос нужно самим.
    req.on('timeout', () => {
      req.destroy(new Error(`нет ответа от сервера ${TIMEOUT_MS / 1000} с`));
    });
    req.on('error', reject);
  });
}

async function main() {
  console.log('Начало скрипта');
  checkUrl(url);

  let totalBytes = 0;
  let totalMs = 0;

  for (let i = 1; i <= COUNT; i++) {
    const start = performance.now();
    // Запросы должны идти строго по очереди, поэтому await в цикле здесь намеренный.
    // eslint-disable-next-line no-await-in-loop
    const bytes = await download(url);
    const ms = performance.now() - start;

    totalBytes += bytes;
    totalMs += ms;
    console.log(`#${i}: ${bytes} байт за ${ms.toFixed(0)} мс`);
  }

  const avgMs = totalMs / COUNT;
  const speed = totalBytes / 1024 / 1024 / (totalMs / 1000);

  console.log(`Среднее время запроса: ${avgMs.toFixed(0)} мс`);
  console.log(`Всего скачано: ${(totalBytes / 1024 / 1024).toFixed(2)} МБ`);
  console.log(`Скорость: ${speed.toFixed(2)} МБ/с`);
}

try {
  await main();
} catch (err) {
  console.error(`Ошибка: ${err.message}`);
  process.exitCode = 1;
}
