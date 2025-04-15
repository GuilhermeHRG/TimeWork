"use strict";var $=Object.create;var m=Object.defineProperty;var k=Object.getOwnPropertyDescriptor;var C=Object.getOwnPropertyNames;var M=Object.getPrototypeOf,j=Object.prototype.hasOwnProperty;var E=(t,e)=>{for(var o in e)m(t,o,{get:e[o],enumerable:!0})},b=(t,e,o,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of C(e))!j.call(t,i)&&i!==o&&m(t,i,{get:()=>e[i],enumerable:!(n=k(e,i))||n.enumerable});return t};var g=(t,e,o)=>(o=t!=null?$(M(t)):{},b(e||!t||!t.__esModule?m(o,"default",{value:t,enumerable:!0}):o,t)),R=t=>b(m({},"__esModule",{value:!0}),t);var B={};E(B,{activate:()=>O,deactivate:()=>P});module.exports=R(B);var a=g(require("vscode")),w=g(require("fs")),u=g(require("path")),l=null,v=null,r=null,T=[],p={},f=!1,c=null,h=Date.now(),x=0;function O(t){console.log("Extens\xE3o ativada."),c=a.window.createWebviewPanel("workTimeTracker","Monitor de Trabalho",a.ViewColumn.Beside,{enableScripts:!0});let e=()=>{c&&(c.webview.html=D(),c.webview.postMessage({fileDurations:p}))},o=()=>{v&&clearTimeout(v),v=setTimeout(()=>{n(),e()},5e3)},n=()=>{if(r&&l&&f){let s=Date.now()-l;p[r]=(p[r]||0)+s,T.push({time:A(),action:"Editou",file:r,duration:d(s)}),l=Date.now()}f=!1},i=()=>{let s=Date.now();x+=s-h,h=s},y=[a.workspace.onDidOpenTextDocument(s=>{n(),r=s.fileName,l=Date.now(),o(),e()}),a.workspace.onDidCloseTextDocument(s=>{r===s.fileName&&(n(),r=null),e()}),a.workspace.onDidChangeTextDocument(()=>{f=!0,l||(l=Date.now()),o(),i()}),a.workspace.onDidSaveTextDocument(()=>S())];t.subscriptions.push(...y,c)}function P(){S(),c?.dispose()}function d(t){let e=Math.floor(t/1e3)%60,o=Math.floor(t/(1e3*60))%60,n=Math.floor(t/(1e3*60*60));return`${String(n).padStart(2,"0")}:${String(o).padStart(2,"0")}:${String(e).padStart(2,"0")}`}function A(){let t=new Date,e=t.toLocaleDateString("pt-BR"),o=t.toLocaleTimeString("pt-BR");return`${e} ${o}`}function D(){let t=Object.values(p).reduce((n,i)=>n+i,0),e=Object.keys(p).length,o=e>0?t/e:0;return`
        <html>
        <head>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body { font-family: Arial, sans-serif; background: #36393f; color: white; padding: 20px; }
                .container { background: #2f3136; padding: 15px; border-radius: 8px; }
                .log { background: #202225; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto; }
                .log-entry { font-size: 12px; padding: 5px 0; border-bottom: 1px solid #40444b; }
                .stats { margin-top: 20px; }
                canvas { background: white; border-radius: 8px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Monitor de Trabalho</h2>
                <p><strong>Arquivo atual:</strong> ${r?u.basename(r):"Nenhum arquivo"}</p>
                <p><strong>Tempo de edi\xE7\xE3o:</strong> ${l?d(Date.now()-l):"Inativo"}</p>
                <div class="stats">
                    <p><strong>Tempo total de edi\xE7\xE3o:</strong> ${d(t)}</p>
                    <p><strong>Tempo m\xE9dio por arquivo:</strong> ${d(o)}</p>
                    <p><strong>Tempo total de inatividade:</strong> ${d(x)}</p>
                </div>
                <canvas id="chart"></canvas>
            </div>
            <div class="log">
                <strong>Atividades Recentes:</strong>
                ${T.map(n=>`<div class="log-entry">${n.time} - ${n.action}: <strong>${u.basename(n.file)}</strong> (${n.duration||"00:00:00"})</div>`).join("")}
            </div>
            <script>
                function formatChartTime(ms) {
                    const sec = Math.floor(ms / 1000) % 60;
                    const min = Math.floor(ms / (1000 * 60)) % 60;
                    const hours = Math.floor(ms / (1000 * 60 * 60));
                    return \`\${String(hours).padStart(2, '0')}:\${String(min).padStart(2, '0')}:\${String(sec).padStart(2, '0')}\`;
                }

                window.addEventListener('message', event => {
                    const data = event.data;
                    const ctx = document.getElementById('chart').getContext('2d');
                    const labels = Object.keys(data.fileDurations).map(file => file.split('/').pop());
                    const values = Object.values(data.fileDurations);

                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Tempo de Edi\xE7\xE3o',
                                data: values,
                                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: context => formatChartTime(context.raw)
                                    }
                                }
                            }
                        }
                    });
                });
            </script>
        </body>
        </html>
    `}function S(){let t=u.join(a.workspace.workspaceFolders?.[0]?.uri.fsPath||"","log.html");w.writeFileSync(t,D()),console.log("Relat\xF3rio salvo em:",t)}0&&(module.exports={activate,deactivate});
