const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const streamPipeline = util.promisify(require('stream').pipeline);

const fetch = require('node-fetch');

const url = 'https://adnmb2.com/Mobile';
const versionJson = './apkVersion.json';

(async () => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`A岛打不开了`);

    const html = await res.text();

    //获取存档版本
    const rawJson = await readFile(versionJson);
    let version = JSON.parse(rawJson);
    console.log(version);

    let workflow = [];
    for (const link of html.matchAll(/https?:\/\/acwiki.org\/apk\/([a-z]+).*\.apk/g)) {
      workflow.push((async () => {
        const apkName = link[1];
        //console.log(apkName);

        const res = await fetch(link[0], { method: 'HEAD' });
        if (!res.ok) throw new Error(`${link[1]}: 获取header失败`);

        const lastModified = res.headers.get('last-modified');//获取上次更改时间
        if (version[apkName] !== lastModified) {//如果和本地不相符
          try {
            console.log(`开始下载 ${apkName}`);

            await download(link[0], `./apk/${apkName}.apk`);
            version[apkName] = lastModified;

            console.log(`${apkName} 下载完成`);

          } catch (err) {
            console.error(`${apkName} 下载失败!`);
          }
        } else {
          console.log(`${apkName} 已经是最新的,跳过`);

        }
      })());
    }

    await Promise.all(workflow);
    console.log('全部下载完成');
    console.log('当前的版本文件', version);

    writeFile(versionJson, JSON.stringify(version));//将最新的版本写入文件

  } catch (err) {
    console.error(err);

  }
})();

async function download(url, path) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
  await streamPipeline(response.body, fs.createWriteStream(path));
}