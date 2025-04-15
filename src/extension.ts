import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let startTime: number | null = null;
let currentFile: string | null = null;
let activityLog: { time: string; action: string; file: string; duration?: string }[] = [];
let fileDurations: Record<string, number> = {};
let panel: vscode.WebviewPanel | null = null;
let inactivityDuration: number = 0;

export function activate(context: vscode.ExtensionContext) {
    console.log('Extensão ativada.');

    const createOrShowPanel = () => {
        if (panel) {
            panel.reveal(vscode.ViewColumn.Beside);
        } else {
            panel = vscode.window.createWebviewPanel(
                'workTimeTracker',
                'Monitor de Trabalho',
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );

            panel.webview.html = generateHtml();
            panel.webview.postMessage({ fileDurations });

            panel.onDidDispose(() => {
                panel = null;
            });
        }
    };

    // 🧠 Status bar que abre o painel
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = `📝 Painel`;
    statusBarItem.tooltip = 'Clique para abrir o painel de produtividade';
    statusBarItem.command = 'extension.toggleDashboard'; // Referência ao comando abaixo
    statusBarItem.show();

    // Registra o comando apenas para o botão (sem mostrar na paleta)
    const openPanelCommand = vscode.commands.registerCommand('extension.toggleDashboard', () => {
        createOrShowPanel();
    });

    // Abrir automaticamente ao iniciar
    createOrShowPanel();

    context.subscriptions.push(statusBarItem, openPanelCommand);
}


export function deactivate() {
    saveReport();
    panel?.dispose();
    // statusBarItem?.dispose();
}

function formatTime(ms: number): string {
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${String(hours).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}


function generateHtml(): string {
    const totalEditingTime = Object.values(fileDurations).reduce((acc, val) => acc + val, 0);
    const fileCount = Object.keys(fileDurations).length;
    const avgTime = fileCount > 0 ? totalEditingTime / fileCount : 0;

    return `
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
                <p><strong>Arquivo atual:</strong> ${currentFile ? path.basename(currentFile) : 'Nenhum arquivo'}</p>
                <p><strong>Tempo de edição atual:</strong> ${startTime ? formatTime(Date.now() - startTime) : 'Inativo'}</p>
                <div class="stats">
                    <p><strong>Tempo total de edição:</strong> ${formatTime(totalEditingTime)}</p>
                    <p><strong>Tempo médio por arquivo:</strong> ${formatTime(avgTime)}</p>
                    <p><strong>Tempo total de inatividade:</strong> ${formatTime(inactivityDuration)}</p>
                </div>
                <canvas id="chart"></canvas>
            </div>
            <div class="log">
                <strong>Atividades Recentes:</strong>
                ${activityLog.map(entry =>
                    `<div class="log-entry">${entry.time} - ${entry.action}: <strong>${path.basename(entry.file)}</strong> (${entry.duration || '00:00:00'})</div>`
                ).join('')}
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
                                label: 'Tempo de Edição',
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
    `;
}

function saveReport() {
    const logPath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'log.html');
    fs.writeFileSync(logPath, generateHtml());
    console.log('Relatório salvo em:', logPath);
}
