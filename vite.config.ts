import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { exec } from 'child_process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'screenshot-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/screenshot' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const { direction, pages, title } = data;
                
                const scriptPath = path.resolve('C:/Users/miyau/OneDrive/000_Works/009_kindleスクショ/kindle_to_pdf.py');
                const cwdPath = path.resolve('C:/Users/miyau/OneDrive/000_Works/009_kindleスクショ');
                
                // コマンド構築（バックグラウンド実行だと画面が真っ黒になるため、startコマンドで別ウィンドウとしてフォアグラウンド実行する）
                // 実行後にエラーが見えるように /c ではなく /K を使用する
                const cmd = `start "" cmd.exe /K "python "${scriptPath}" --direction ${direction} --pages ${pages} --title "${title}""`;
                
                // 実行
                exec(cmd, { cwd: cwdPath }, (error, stdout, stderr) => {
                  if (error) {
                    console.error(`exec error: ${error}`);
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: error.message, stderr }));
                    return;
                  }
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, output: stdout }));
                });
              } catch (e) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
