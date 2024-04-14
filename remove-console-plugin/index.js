import fs from "fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generator from "@babel/generator";

import { exec } from "child_process";

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      if (stderr) {
        reject(new Error(stderr));
        return;
      }
      resolve(stdout.trim());
    });
  });
};
let username = "";
let isDev = false;
export default function myPlugin() {
  return {
    name: "remove-console-plugin",
    config(config, ctx) {
      isDev = ctx.mode === "development";
    },
    async load(id) {
      const url = id;
      if (url.includes("/src/") && /\.([tj]sx?|js)$/.test(url) && isDev) {
        let originalContent = fs.readFileSync(id, "utf-8");
        try {
          if (!username) {
            username = await execCommand("git config user.name");
          }
          const blameOutput = await execCommand(`git blame ${id} | nl -n ln`);

          let map = blameOutput
            .trim()
            .split("\n")
            .reduce((acc, line) => {
              let [numStr, hash, author, ...rest] = line.split(/\s+/);
              let num = parseInt(numStr, 10);
              acc[num] = author.replace("(", "").replace(")", ""); // 去掉圆括号
              return acc;
            }, {});

          const ast = parse(originalContent, {
            sourceType: "module",
            plugins: ["jsx", "typescript"],
          });
          traverse.default(ast, {
            CallExpression(path) {
              if (
                path.node.callee.type === "MemberExpression" &&
                path.node.callee.property.name === "log"
              ) {
                const logLine = path.node.loc.start.line;
                const commiter = map[logLine];
                if (commiter !== username && commiter !== "Not") {
                  path.remove();
                }
              }
            },
          });
          const { code } = generator.default(ast);
          return code;
        } catch (error) {
          return originalContent;
        }
      }
    },
  };
}
