import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { authenticateUser } from './auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import * as os from 'os';



let panelInitialized = false;

let startTime: number | null = null;
let currentFile: string | null = null;
let activityLog: { time: string; action: string; file: string; duration?: string }[] = [];
let fileDurations: Record<string, number> = {};
let panel: vscode.WebviewPanel | null = null;
let inactivityDuration: number = 0;
let inactivityTimer: NodeJS.Timeout | null = null;
let lastActiveTime: number = Date.now();
let isInactive = false;
const projectName = vscode.workspace.workspaceFolders?.[0]?.name || 'sem-projeto';
const machineName = os.hostname();
let currentUserUid: string | null = null;



function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const ifaceName of Object.keys(ifaces)) {
    for (const iface of ifaces[ifaceName] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'unknown';
}

const machineIp = getLocalIp();


export function activate(context: vscode.ExtensionContext) {
    
    authenticateUser().then(user => {
    if (user) {
        currentUserUid = user.uid; 
        console.log('Usuário autenticado:', user);
    } else {
        console.log('Usuário não autenticado.');
    }
});



    console.log('Extensão ativada.');

    const savedDurations = context.globalState.get<Record<string, number>>('fileDurations');
    const savedLog = context.globalState.get<typeof activityLog>('activityLog');
    if (savedDurations) fileDurations = savedDurations;
    if (savedLog) activityLog = savedLog;
 
        if (!panelInitialized) {
            fileDurations = {};
            activityLog = [];
            inactivityDuration = 0;
            startTime = null;
            currentFile = null;
            panelInitialized = true;
        }
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
            panelInitialized = false; 
        });
    }
};


    function updateAndPersist(context: vscode.ExtensionContext) {
        context.globalState.update('fileDurations', fileDurations);
        context.globalState.update('activityLog', activityLog);
        if (panel) panel.webview.postMessage({ fileDurations });

        sendReportToFirebase(); // aqui
    }


    const marcarInatividade = () => {
        if (!isInactive) {
            isInactive = true;
            lastActiveTime = Date.now();
            activityLog.push({
                time: new Date().toISOString(),
                action: 'inatividade detectada',
                file: currentFile || '',
                duration: '---'
            });
            updateAndPersist(context);
        }
    };

    const retornarDeInatividade = () => {
        if (isInactive) {
            const now = Date.now();
            const inactiveTime = now - lastActiveTime;
            inactivityDuration += inactiveTime;
            activityLog.push({
                time: new Date().toISOString(),
                action: 'retorno da inatividade',
                file: currentFile || '',
                duration: formatTime(inactiveTime)
            });
            isInactive = false;
            updateAndPersist(context);
        }
        lastActiveTime = Date.now();
    };

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = `📝 Painel`;
    statusBarItem.tooltip = 'Clique para abrir o painel de produtividade';
    statusBarItem.command = 'extension.toggleDashboard';
    statusBarItem.show();

    const openPanelCommand = vscode.commands.registerCommand('extension.toggleDashboard', () => {
        createOrShowPanel();
    });

    vscode.workspace.onDidChangeTextDocument(() => {
        retornarDeInatividade();
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(marcarInatividade, 60 * 1000);
    });

    vscode.window.onDidChangeWindowState(state => {
        if (state.focused) {
            retornarDeInatividade();
        } else {
            marcarInatividade();
        }
    });

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            if (startTime !== null && currentFile) {
                const duration = Date.now() - startTime;
                fileDurations[currentFile] = (fileDurations[currentFile] || 0) + duration;
                activityLog.push({
                    time: new Date().toISOString(),
                    action: 'troca de arquivo',
                    file: currentFile,
                    duration: formatTime(duration)
                });
                updateAndPersist(context);
            }
            currentFile = editor.document.uri.fsPath;
            startTime = Date.now();
        }
    });

    vscode.workspace.onDidCloseTextDocument(() => {
        if (startTime !== null && currentFile) {
            const duration = Date.now() - startTime;
            fileDurations[currentFile] = (fileDurations[currentFile] || 0) + duration;
            activityLog.push({
                time: new Date().toISOString(),
                action: 'fechamento',
                file: currentFile,
                duration: formatTime(duration)
            });
            updateAndPersist(context);
            startTime = null;
        }
    });

    createOrShowPanel();
    context.subscriptions.push(statusBarItem, openPanelCommand);
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
                <p style="margin-top: 10px; font-size: 12px; color: #aaa;">
                    Atualizado em: <span id="dataAtualizada"></span>
                </p>
            </div>

            <div class="log">
                <strong>Atividades Recentes:</strong>
                ${activityLog.map(entry => {
        const dataFormatada = new Date(entry.time).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        return `<div class="log-entry">${dataFormatada} - ${entry.action}: <strong>${path.basename(entry.file)}</strong> (${entry.duration || '00:00:00'})</div>`;
    }).join('')}

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
    `;
}


function isHoje(date: Date): boolean {
    const hoje = new Date();
    return (
        date.getDate() === hoje.getDate() &&
        date.getMonth() === hoje.getMonth() &&
        date.getFullYear() === hoje.getFullYear()
    );
}




function getHojeISODate(): string {
  const hoje = new Date();
  return hoje.toISOString().split('T')[0]; 
}

function sendReportToFirebase() {
  const logsHoje = activityLog.filter(log => isHoje(new Date(log.time)));

  const arquivosHoje = logsHoje.map(log => log.file);
  const fileDurationsHoje: Record<string, number> = {};

  arquivosHoje.forEach(file => {
    if (fileDurations[file]) {
      fileDurationsHoje[file] = fileDurations[file];
    }
  });

  const dataHoje = getHojeISODate();
  const documentId = `${projectName}-${dataHoje}`;

const jsonPayload = {
  fileDurations: fileDurationsHoje,
  activityLog: logsHoje,
  inactivityDuration,
  timestamp: new Date().toISOString(),
  machineName,
  machineIp,
  projeto: projectName,
  identifier: `${machineName}-${machineIp}`,
};



const ref = doc(db, 'relatorios', documentId); 

  setDoc(ref, jsonPayload)
    .then(() => console.log(`✅ Relatório salvo como: ${documentId}`))
    .catch(err => console.error('❌ Erro ao enviar relatório:', err));
}



function saveReport() {
    const logPath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'log.html');
    fs.writeFileSync(logPath, generateHtml());
    console.log('📄 Relatório HTML salvo em:', logPath);

    sendReportToFirebase();
}


