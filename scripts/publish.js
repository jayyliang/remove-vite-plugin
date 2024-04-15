// 自动发布脚本
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const { sshConfig } = require("./config");
/* ------------------ 请配置服务器信息 --- start --------------------- */
const zipName = "test.zip";
const remotePath = `/www/wwwroot/test-${+new Date()}`; // 要上传到服务器的目标路径
const originRemotePath = "/www/wwwroot/test";
const distPath = "../dist"; // 要压缩的文件夹路径
/* ------------------ 配置服务器信息 --- end --------------------- */

const output = fs.createWriteStream(zipName); // 压缩后的文件
const archive = archiver("zip");
output.on("close", function () {
  console.log(`${archive.pointer()} total bytes`);
  console.log(
    "archiver has been finalized and the output file descriptor has closed."
  );
});
archive.on("error", function (err) {
  throw err;
});
archive.pipe(output);
const directoryPath = path.join(__dirname, distPath);
archive.directory(directoryPath, false);
archive.finalize();
const Client = require("ssh2").Client;
const conn = new Client();
conn
  .on("ready", function () {
    console.log("服务器连接成功");
    conn.exec(`mkdir ${remotePath}`, (err) => {
      if (err) throw err;
      conn.sftp(function (err, sftp) {
        if (err) throw err;
        const readStream = fs.createReadStream(zipName);
        const writeStream = sftp.createWriteStream(remotePath + "/" + zipName);
        readStream.pipe(writeStream);
        writeStream.on("close", function () {
          console.log(`File ${remotePath} 上传 完成`);
          // 解压
          conn.exec(
            `cd ${remotePath} && unzip -o ${zipName} && mv ${originRemotePath} ${originRemotePath}-bak && mv ${remotePath} ${originRemotePath} && rm -rf ${originRemotePath}-bak`,
            function (err, stream) {
              if (err) throw err;
              stream
                .on("close", function (code, signal) {
                  console.log("部署 完成");
                  // 删除本地压缩包
                  fs.unlinkSync(zipName);
                  conn.end();
                })
                .on("data", function (data) {
                  console.log("解压中: " + data);
                });
            }
          );
        });
      });
    });
  })
  .connect(sshConfig);
