"use strict";var A=Object.create;var f=Object.defineProperty;var I=Object.getOwnPropertyDescriptor;var B=Object.getOwnPropertyNames;var M=Object.getPrototypeOf,L=Object.prototype.hasOwnProperty;var O=(t,e)=>{for(var o in e)f(t,o,{get:e[o],enumerable:!0})},T=(t,e,o,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of B(e))!L.call(t,n)&&n!==o&&f(t,n,{get:()=>e[n],enumerable:!(i=I(e,n))||i.enumerable});return t};var b=(t,e,o)=>(o=t!=null?A(M(t)):{},T(e||!t||!t.__esModule?f(o,"default",{value:t,enumerable:!0}):o,t)),P=t=>T(f({},"__esModule",{value:!0}),t);var z={};O(z,{activate:()=>j,deactivate:()=>E});module.exports=P(z);var a=b(require("vscode")),y=b(require("fs")),v=b(require("path")),c=null,r=null,u=[],d={},s=null,C=0,w=null,S=Date.now(),h=!1;function j(t){console.log("Extens\xE3o ativada.");let e=t.globalState.get("fileDurations"),o=t.globalState.get("activityLog");e&&(d=e),o&&(u=o);let i=()=>{s?s.reveal(a.ViewColumn.Beside):(s=a.window.createWebviewPanel("workTimeTracker","Monitor de Trabalho",a.ViewColumn.Beside,{enableScripts:!0}),s.webview.html=$(),s.webview.postMessage({fileDurations:d}),s.onDidDispose(()=>{s=null}))},n=()=>{t.globalState.update("fileDurations",d),t.globalState.update("activityLog",u),s&&s.webview.postMessage({fileDurations:d})},D=()=>{h||(h=!0,S=Date.now(),u.push({time:new Date().toISOString(),action:"inatividade detectada",file:r||"",duration:"---"}),n())},x=()=>{if(h){let m=Date.now()-S;C+=m,u.push({time:new Date().toISOString(),action:"retorno da inatividade",file:r||"",duration:p(m)}),h=!1,n()}S=Date.now()},g=a.window.createStatusBarItem(a.StatusBarAlignment.Left,100);g.text="\u{1F4DD} Painel",g.tooltip="Clique para abrir o painel de produtividade",g.command="extension.toggleDashboard",g.show();let k=a.commands.registerCommand("extension.toggleDashboard",()=>{i()});a.workspace.onDidChangeTextDocument(()=>{x(),w&&clearTimeout(w),w=setTimeout(D,60*1e3)}),a.window.onDidChangeWindowState(l=>{l.focused?x():D()}),a.window.onDidChangeActiveTextEditor(l=>{if(l){if(c!==null&&r){let m=Date.now()-c;d[r]=(d[r]||0)+m,u.push({time:new Date().toISOString(),action:"troca de arquivo",file:r,duration:p(m)}),n()}r=l.document.uri.fsPath,c=Date.now()}}),a.workspace.onDidCloseTextDocument(()=>{if(c!==null&&r){let l=Date.now()-c;d[r]=(d[r]||0)+l,u.push({time:new Date().toISOString(),action:"fechamento",file:r,duration:p(l)}),n(),c=null}}),i(),t.subscriptions.push(g,k)}function E(){R(),s?.dispose()}function p(t){let e=Math.floor(t/1e3)%60,o=Math.floor(t/(1e3*60))%60,i=Math.floor(t/(1e3*60*60));return`${String(i).padStart(2,"0")}:${String(o).padStart(2,"0")}:${String(e).padStart(2,"0")}`}function $(){let t=Object.values(d).reduce((i,n)=>i+n,0),e=Object.keys(d).length,o=e>0?t/e:0;return`
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
                <p><strong>Arquivo atual:</strong> ${r?v.basename(r):"Nenhum arquivo"}</p>
                <p><strong>Tempo de edi\xE7\xE3o atual:</strong> ${c?p(Date.now()-c):"Inativo"}</p>
                <div class="stats">
                    <p><strong>Tempo total de edi\xE7\xE3o:</strong> ${p(t)}</p>
                    <p><strong>Tempo m\xE9dio por arquivo:</strong> ${p(o)}</p>
                    <p><strong>Tempo total de inatividade:</strong> ${p(C)}</p>
                </div>
                <canvas id="chart"></canvas>
                <p style="margin-top: 10px; font-size: 12px; color: #aaa;">
                    Atualizado em: <span id="dataAtualizada"></span>
                </p>
            </div>

            <div class="log">
                <strong>Atividades Recentes:</strong>
                ${u.map(i=>`<div class="log-entry">${new Date(i.time).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})} - ${i.action}: <strong>${v.basename(i.file)}</strong> (${i.duration||"00:00:00"})</div>`).join("")}

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
                    const labels = Object.keys(data.fileDurations).map(file => file.split(/[\\\\/]/).pop());
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

                    // Atualiza a data no formato pt-BR
                    const dataAtual = new Date();
                    const formatado = dataAtual.toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    document.getElementById('dataAtualizada').innerText = formatado;
                });
            </script>
        </body>
        </html>
    `}function R(){let t=v.join(a.workspace.workspaceFolders?.[0]?.uri.fsPath||"","log.html");y.writeFileSync(t,$()),console.log("Relat\xF3rio salvo em:",t)}0&&(module.exports={activate,deactivate});
