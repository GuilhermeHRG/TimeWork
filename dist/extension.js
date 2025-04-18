"use strict";var h=Object.create;var l=Object.defineProperty;var f=Object.getOwnPropertyDescriptor;var w=Object.getOwnPropertyNames;var x=Object.getPrototypeOf,S=Object.prototype.hasOwnProperty;var $=(t,e)=>{for(var o in e)l(t,o,{get:e[o],enumerable:!0})},g=(t,e,o,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of w(e))!S.call(t,s)&&s!==o&&l(t,s,{get:()=>e[s],enumerable:!(a=f(e,s))||a.enumerable});return t};var c=(t,e,o)=>(o=t!=null?h(x(t)):{},g(e||!t||!t.__esModule?l(o,"default",{value:t,enumerable:!0}):o,t)),T=t=>g(l({},"__esModule",{value:!0}),t);var j={};$(j,{activate:()=>k,deactivate:()=>D});module.exports=T(j);var n=c(require("vscode")),v=c(require("fs")),i=c(require("path")),m=null,u=null,y=[],p={},r=null,C=0;function k(t){console.log("Extens\xE3o ativada.");let e=()=>{r?r.reveal(n.ViewColumn.Beside):(r=n.window.createWebviewPanel("workTimeTracker","Monitor de Trabalho",n.ViewColumn.Beside,{enableScripts:!0}),r.webview.html=b(),r.webview.postMessage({fileDurations:p}),r.onDidDispose(()=>{r=null}))},o=n.window.createStatusBarItem(n.StatusBarAlignment.Left,100);o.text="\u{1F4DD} Painel",o.tooltip="Clique para abrir o painel de produtividade",o.command="extension.toggleDashboard",o.show();let a=n.commands.registerCommand("extension.toggleDashboard",()=>{e()});e(),t.subscriptions.push(o,a)}function D(){M(),r?.dispose()}function d(t){let e=Math.floor(t/1e3)%60,o=Math.floor(t/(1e3*60))%60,a=Math.floor(t/(1e3*60*60));return`${String(a).padStart(2,"0")}:${String(o).padStart(2,"0")}:${String(e).padStart(2,"0")}`}function b(){let t=Object.values(p).reduce((a,s)=>a+s,0),e=Object.keys(p).length,o=e>0?t/e:0;return`
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
                <p><strong>Arquivo atual:</strong> ${u?i.basename(u):"Nenhum arquivo"}</p>
                <p><strong>Tempo de edi\xE7\xE3o atual:</strong> ${m?d(Date.now()-m):"Inativo"}</p>
                <div class="stats">
                    <p><strong>Tempo total de edi\xE7\xE3o:</strong> ${d(t)}</p>
                    <p><strong>Tempo m\xE9dio por arquivo:</strong> ${d(o)}</p>
                    <p><strong>Tempo total de inatividade:</strong> ${d(C)}</p>
                </div>
                <canvas id="chart"></canvas>
            </div>
            <div class="log">
                <strong>Atividades Recentes:</strong>
                ${y.map(a=>`<div class="log-entry">${a.time} - ${a.action}: <strong>${i.basename(a.file)}</strong> (${a.duration||"00:00:00"})</div>`).join("")}
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
    `}function M(){let t=i.join(n.workspace.workspaceFolders?.[0]?.uri.fsPath||"","log.html");v.writeFileSync(t,b()),console.log("Relat\xF3rio salvo em:",t)}0&&(module.exports={activate,deactivate});
