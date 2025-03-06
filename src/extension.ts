import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let startTime: number | null = null;
let inactivityTimer: NodeJS.Timeout | null = null;
let currentFile: string | null = null;
let activityLog: { time: string; action: string; file: string; duration?: string }[] = [];
let fileDurations: Record<string, number> = {};
let isTyping = false;
let panel: vscode.WebviewPanel | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('Extensão ativada.');

    panel = vscode.window.createWebviewPanel(
        'workTimeTracker',
        'Monitor de Trabalho',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const updatePanel = () => {
        if (panel) {
            panel.webview.html = generateHtml();
            panel.webview.postMessage({ fileDurations });
        }
    };

    const resetInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            storeEditingTime();
            updatePanel();
        }, 5000);
    };

    const storeEditingTime = () => {
        if (currentFile && startTime && isTyping) {
            const duration = Date.now() - startTime;
            fileDurations[currentFile] = (fileDurations[currentFile] || 0) + duration;

            activityLog.push({
                time: getTimeString(),
                action: 'Editou',
                file: currentFile,
                duration: formatTime(duration),
            });

            startTime = Date.now();
        }
        isTyping = false;
    };

    const listeners = [
        vscode.workspace.onDidOpenTextDocument((document) => {
            storeEditingTime();
            currentFile = document.fileName;
            startTime = Date.now();
            resetInactivityTimer();
            updatePanel();
        }),

        vscode.workspace.onDidCloseTextDocument((document) => {
            if (currentFile === document.fileName) {
                storeEditingTime();
                currentFile = null;
            }
            updatePanel();
        }),

        vscode.workspace.onDidChangeTextDocument(() => {
            isTyping = true;
            if (!startTime) startTime = Date.now();
            resetInactivityTimer();
        }),

        vscode.workspace.onDidSaveTextDocument(() => saveReport()),
    ];

    context.subscriptions.push(...listeners, panel);
}

export function deactivate() {
    saveReport();
    panel?.dispose();
}

function formatTime(ms: number): string {
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${String(hours).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function getTimeString(): string {
    return new Date().toLocaleTimeString();
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
                <p><strong>Tempo de edição:</strong> ${startTime ? formatTime(Date.now() - startTime) : 'Inativo'}</p>
                <div class="stats">
                    <p><strong>Tempo total de edição:</strong> ${formatTime(totalEditingTime)}</p>
                    <p><strong>Tempo médio por arquivo:</strong> ${formatTime(avgTime)}</p>
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
