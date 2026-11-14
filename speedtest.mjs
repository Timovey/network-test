import https from 'node:https';

const url = process.argv[2];
const COUNT = 10;

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
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`сервер ответил ${res.statusCode}`));
        return;
      }

      let bytes = 0;
      res.on('data', (d) => (bytes += d.length));
      res.on('end', () => resolve(bytes));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Начало скрипта');
  checkUrl(url);

  let totalBytes = 0;
  let totalMs = 0;

  for (let i = 1; i <= COUNT; i++) {
    const start = Date.now();
    // Запросы должны идти строго по очереди, поэтому await в цикле здесь намеренный.
    // eslint-disable-next-line no-await-in-loop
    const bytes = await download(url);
    const ms = Date.now() - start;

    totalBytes += bytes;
    totalMs += ms;
    console.log(`#${i}: ${bytes} байт за ${ms} мс`);
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
