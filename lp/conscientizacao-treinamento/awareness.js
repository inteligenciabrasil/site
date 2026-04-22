let currentSection = 0;
const totalSections = 15;
let timerInterval = null;
let elapsedSeconds = 0;
let quizAnswers = {};
const correctAnswers = { 1:'b', 2:'b', 3:'b', 4:'b', 5:'c', 6:'b', 7:'c' };

const decisionsState = {};

document.addEventListener('DOMContentLoaded', () => {
  updateProgress();
  bindA11yControls();
  applyMotionFromPref();
  applyFontScaleFromPref();
  restoreActionChecklist();
  // Keyboard support for quiz options and action items
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      const el = e.target;
      if(el.classList.contains('quiz-option') || el.classList.contains('action-item')){
        e.preventDefault();
        el.click();
      }
    }
  });
});

function nextSection(){
  if(currentSection < totalSections - 1){
    document.getElementById(`section-${currentSection}`).classList.remove('active');
    currentSection++;
    document.getElementById(`section-${currentSection}`).classList.add('active');
    updateProgress();
    window.scrollTo({ top:0, behavior:'smooth' });

    if(currentSection === 1 && !timerInterval){
      startTimer();
    }
  }
}

function prevSection(){
  if(currentSection > 0){
    document.getElementById(`section-${currentSection}`).classList.remove('active');
    currentSection--;
    document.getElementById(`section-${currentSection}`).classList.add('active');
    updateProgress();
    window.scrollTo({ top:0, behavior:'smooth' });
  }
}

const moduleNames = [
  '', 'Por que importa', 'Ameaças', 'Eng. Social', 'Senhas',
  'MFA', 'Dados', 'Incidentes', 'Ajuda', 'Cotidiano',
  'IA', 'Mobile', 'Redes Sociais', 'Quiz', 'Conclusão'
];

function updateProgress(){
  const progress = currentSection === 0 ? 0 : Math.round((currentSection / (totalSections - 1)) * 100);
  document.getElementById('progressFill').style.width = `${progress}%`;
  document.getElementById('progressText').textContent = `${progress}%`;

  const indicator = document.getElementById('moduleIndicator');
  const indicatorText = document.getElementById('moduleIndicatorText');
  if(currentSection > 0 && currentSection < totalSections){
    indicator.classList.add('visible');
    indicatorText.textContent = currentSection <= 12
      ? `Módulo ${currentSection} · ${moduleNames[currentSection]}`
      : moduleNames[currentSection];
  } else {
    indicator.classList.remove('visible');
  }
}

function startTimer(){
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    document.getElementById('timerDisplay').textContent =
      `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  }, 1000);
}

function stopTimer(){
  if(timerInterval){
    clearInterval(timerInterval);
    timerInterval = null;
  }
  return document.getElementById('timerDisplay').textContent;
}

function checkPassword(password){
  const bars = [
    document.getElementById('strength1'),
    document.getElementById('strength2'),
    document.getElementById('strength3'),
    document.getElementById('strength4')
  ];
  const strengthText = document.getElementById('strengthText');
  const crackTime = document.getElementById('crackTime');

  bars.forEach(b => b.classList.remove('active','weak','medium','strong'));

  if(!password){
    strengthText.textContent = 'Digite uma senha para ver a força';
    crackTime.textContent = '-';
    return;
  }

  let strength = 0;

  if(password.length >= 8) strength++;
  if(password.length >= 12) strength++;
  if(password.length >= 16) strength++;
  if(password.length >= 20) strength++;

  if(/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if(/\d/.test(password)) strength++;
  if(/[^a-zA-Z0-9]/.test(password)) strength++;

  const commonPatterns = ['password','senha','123456','qwerty','admin','letmein','welcome','empresa','Company'];
  if(commonPatterns.some(p => password.toLowerCase().includes(p.toLowerCase()))){
    strength = Math.max(0, strength - 3);
  }

  const level = Math.min(4, Math.ceil(strength / 1.75));

  let strengthClass = 'weak';
  let strengthLabel = 'muito fraca';
  let time = 'instantâneo a segundos';

  if(level === 2){
    strengthClass = 'weak';
    strengthLabel = 'fraca';
    time = 'minutos a horas';
  } else if(level === 3){
    strengthClass = 'medium';
    strengthLabel = 'boa';
    time = 'meses a anos';
  } else if(level === 4){
    strengthClass = 'strong';
    strengthLabel = 'forte';
    time = 'anos ou mais';
  }

  for(let i=0; i<level; i++){
    bars[i].classList.add('active', strengthClass);
  }

  strengthText.textContent = `Força: ${strengthLabel}`;
  crackTime.textContent = time;
}

const decisionFeedback = {
  d1: {
    good: '<strong>Por que está certo:</strong> Confirmar por canal oficial quebra a cadeia do golpe. Atacantes dependem de ação impulsiva — ao parar e verificar, você anula a manipulação.<br><strong>Na empresa:</strong> Antes de qualquer pagamento com dados novos, ligue para o fornecedor no telefone que consta no contrato original.',
    bad: '<strong>Atenção:</strong> Pressa e mudança de dados bancários são sinais clássicos de fraude. Atacantes criam urgência para impedir que você pense.<br><strong>Na empresa:</strong> Sempre segure o pagamento e valide por telefone oficial. Reporte ao time de segurança mesmo que depois seja legítimo.'
  },
  d2: {
    good: '<strong>Por que está certo:</strong> Suporte real nunca pede seu código MFA nem instala software por telefone sem chamado formal. Desligar e ligar de volta no número oficial confirma a identidade.<br><strong>Na empresa:</strong> Anote o nome de quem ligou e o horário. Ligue para o número oficial do suporte para verificar se houve solicitação.',
    bad: '<strong>Atenção:</strong> Compartilhar código MFA entrega o acesso da sua conta. Mesmo que pareça urgente, nenhum processo legítimo depende de compartilhar código por telefone.<br><strong>Na empresa:</strong> Nunca compartilhe senha ou código. Reporte a ligação suspeita imediatamente ao time de segurança.'
  },
  d3: {
    good: '<strong>Por que está certo:</strong> Ferramentas públicas de IA podem armazenar e usar seus dados para treinar modelos. Dados de clientes em servidores externos violam LGPD e políticas internas.<br><strong>Na empresa:</strong> Use apenas ferramentas de IA homologadas. Na dúvida, pergunte ao time de segurança antes de colar qualquer dado.',
    bad: '<strong>Atenção:</strong> "Só um resumo" não muda o fato de que os dados foram enviados para servidor externo. O risco existe independente da intenção.<br><strong>Na empresa:</strong> Anonimize dados antes de usar IA ou utilize ferramentas corporativas aprovadas que tenham acordos de proteção de dados.'
  },
  d4: {
    good: '<strong>Por que está certo:</strong> Revelar stack de segurança ajuda atacantes a planejar ataques direcionados. OSINT via LinkedIn é técnica comum de reconhecimento.<br><strong>Na empresa:</strong> Agradeça sem revelar detalhes internos. Direcione para o canal oficial (site, RH). Informe o time de segurança sobre abordagens suspeitas.',
    bad: '<strong>Atenção:</strong> Listar ferramentas de segurança da empresa fornece um mapa para atacantes contornarem suas defesas.<br><strong>Na empresa:</strong> Nunca revele ferramentas, fornecedores ou processos internos de segurança em redes sociais. Na dúvida, consulte antes de responder.'
  }
};

function pickDecision(groupId, optionId, isGood){
  if(decisionsState[groupId]) return;

  decisionsState[groupId] = { optionId, isGood };

  const buttons = document.querySelectorAll(`button[onclick^="pickDecision('${groupId}'"]`);
  buttons.forEach(btn => btn.classList.remove('selected'));
  const clicked = Array.from(buttons).find(b => b.getAttribute('onclick').includes(`'${optionId}'`));
  if(clicked) clicked.classList.add('selected');

  const fb = document.getElementById(`${groupId}fb`);
  const data = decisionFeedback[groupId];
  fb.classList.add('show');
  if(isGood){
    fb.classList.add('good');
    fb.innerHTML = data ? data.good : 'Correto.';
  } else {
    fb.classList.add('bad');
    fb.innerHTML = data ? data.bad : 'Incorreto.';
  }
}

function toggleAction(el){
  el.classList.toggle('done');
  const isDone = el.classList.contains('done');
  el.setAttribute('aria-checked', isDone ? 'true' : 'false');
  saveActionChecklist();
}

function saveActionChecklist(){
  const items = document.querySelectorAll('.action-item');
  const state = Array.from(items).map(item => item.classList.contains('done'));
  localStorage.setItem('ib_awareness_checklist', JSON.stringify(state));
}

function restoreActionChecklist(){
  const saved = localStorage.getItem('ib_awareness_checklist');
  if(!saved) return;
  try {
    const state = JSON.parse(saved);
    const items = document.querySelectorAll('.action-item');
    state.forEach((done, i) => {
      if(done && items[i]){
        items[i].classList.add('done');
        items[i].setAttribute('aria-checked', 'true');
      }
    });
  } catch(e){}
}

function selectOption(questionNum, element, answer){
  const container = document.getElementById(`quiz${questionNum}`);
  container.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected'));
  element.classList.add('selected');
  quizAnswers[questionNum] = answer;

  const dot = document.getElementById(`qDot${questionNum}`);
  if(dot) dot.classList.add('answered');
  const counter = document.getElementById('quizAnsweredCount');
  if(counter) counter.textContent = Object.keys(quizAnswers).length;
}

const quizExplanations = {
  1: {
    correct: '<strong>Correto.</strong> Se um serviço vazar, atacantes testam a mesma senha em dezenas de outros sites automaticamente.<br><strong>Na empresa:</strong> Use um gerenciador de senhas e gere uma senha única para cada serviço.',
    incorrect: '<strong>Incorreto.</strong> Reutilizar senha significa que um único vazamento compromete todas as suas contas.<br><strong>Na empresa:</strong> Ative um gerenciador de senhas hoje e troque senhas reutilizadas.'
  },
  2: {
    correct: '<strong>Correto.</strong> Validar por canal oficial interrompe a fraude. Mudança de conta bancária com urgência é um dos golpes mais comuns no Brasil.<br><strong>Na empresa:</strong> Sempre confirme alterações de pagamento por telefone, usando o número do contrato.',
    incorrect: '<strong>Incorreto.</strong> Pagamentos urgentes com dados novos são o padrão clássico de BEC (Business Email Compromise).<br><strong>Na empresa:</strong> Segure o pagamento e valide com o fornecedor pelo canal oficial.'
  },
  3: {
    correct: '<strong>Correto.</strong> MFA adiciona uma segunda verificação (código, biometria ou app) além da senha, dificultando acesso mesmo com senha vazada.<br><strong>Na empresa:</strong> Ative MFA em todos os serviços que oferecem. Prefira app autenticador ao invés de SMS.',
    incorrect: '<strong>Incorreto.</strong> MFA não é antivírus nem criptografia — é uma camada extra de verificação da sua identidade.<br><strong>Na empresa:</strong> Verifique se MFA está ativo no e-mail, VPN e sistemas críticos.'
  },
  4: {
    correct: '<strong>Correto.</strong> Prompts de MFA não solicitados indicam que alguém tem sua senha e está tentando entrar. É um ataque de fadiga de MFA.<br><strong>Na empresa:</strong> Negue todos os prompts, troque sua senha imediatamente e reporte ao time de segurança.',
    incorrect: '<strong>Incorreto.</strong> Aprovar um prompt não solicitado concede acesso ao atacante. Nunca aprove MFA que você não iniciou.<br><strong>Na empresa:</strong> Troque a senha e reporte imediatamente. Isso é evidência de comprometimento.'
  },
  5: {
    correct: '<strong>Correto.</strong> Reportar rápido permite contenção antes que o dano se espalhe. A maioria dos incidentes graves começou pequena e foi ignorada.<br><strong>Na empresa:</strong> Reporte pelo canal oficial de segurança. Não tente resolver sozinho. Sem punição por alarme falso.',
    incorrect: '<strong>Incorreto.</strong> Esperar certeza absoluta ou tentar resolver sozinho permite que o incidente se agrave.<br><strong>Na empresa:</strong> Reporte na dúvida. O time de segurança prefere 10 alarmes falsos a 1 incidente real não reportado.'
  },
  6: {
    correct: '<strong>Correto.</strong> Ferramentas públicas de IA não garantem confidencialidade. Dados de clientes em LLMs públicos violam LGPD e políticas internas.<br><strong>Na empresa:</strong> Use apenas ferramentas de IA aprovadas. Consulte o time de segurança antes de usar IA para dados corporativos.',
    incorrect: '<strong>Incorreto.</strong> Dados colados em IA pública podem ser armazenados e usados para treinamento, mesmo que "pareça seguro".<br><strong>Na empresa:</strong> Antes de usar qualquer IA com dados da empresa, verifique se é uma ferramenta homologada.'
  },
  7: {
    correct: '<strong>Correto.</strong> Bloqueio remoto impede acesso aos dados corporativos. Cada minuto sem reporte é tempo para o atacante explorar o dispositivo.<br><strong>Na empresa:</strong> Ligue imediatamente para o time de segurança. Depois troque senhas e registre BO.',
    incorrect: '<strong>Incorreto.</strong> Esperar ou resolver sozinho dá tempo para acesso a e-mails, autenticadores e dados corporativos no dispositivo.<br><strong>Na empresa:</strong> Reporte imediatamente para bloqueio remoto. Não espere — cada minuto conta.'
  }
};

function submitQuiz(){
  const totalQuestions = 7;

  const notif = document.getElementById('quizNotification');
  if(Object.keys(quizAnswers).length < totalQuestions){
    notif.textContent = 'Responda todas as perguntas antes de enviar.';
    notif.className = 'quiz-notification show warning';
    notif.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }
  notif.className = 'quiz-notification';

  let score = 0;

  for(let i=1; i<=totalQuestions; i++){
    const container = document.getElementById(`quiz${i}`);
    const feedback = document.getElementById(`feedback${i}`);
    const options = container.querySelectorAll('.quiz-option');

    options.forEach(opt => {
      opt.style.pointerEvents = 'none';
      const optAnswer = opt.querySelector('.quiz-option-marker').textContent.toLowerCase();
      if(optAnswer === correctAnswers[i]) opt.classList.add('correct');
      if(opt.classList.contains('selected') && optAnswer !== correctAnswers[i]) opt.classList.add('incorrect');
    });

    if(quizAnswers[i] === correctAnswers[i]){
      score++;
      feedback.innerHTML = quizExplanations[i].correct;
      feedback.className = 'quiz-feedback show correct';
    } else {
      feedback.innerHTML = quizExplanations[i].incorrect;
      feedback.className = 'quiz-feedback show incorrect';
    }
  }

  const submitBtn = document.getElementById('submitQuizBtn');
  submitBtn.textContent = `Resultado: ${score}/${totalQuestions}, continuar`;
  submitBtn.onclick = () => {
    document.getElementById('finalScore').textContent = `${score}/${totalQuestions}`;
    document.getElementById('finalTime').textContent = stopTimer();

    const level = score >= 6 ? 'Proativo' : (score >= 4 ? 'Consciente' : 'Básico');
    document.getElementById('certLevelChip').textContent = `Nível: ${level}`;

    document.getElementById('completionDate').textContent = new Date().toLocaleDateString('pt-BR', {
      day:'2-digit', month:'long', year:'numeric'
    });

    nextSection();
  };
}

function restartCourse(){
  const totalQuestions = 7;

  currentSection = 0;
  elapsedSeconds = 0;
  quizAnswers = {};
  for (const k in decisionsState) delete decisionsState[k];

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-0').classList.add('active');

  document.getElementById('timerDisplay').textContent = '00:00';
  document.getElementById('passwordInput').value = '';
  checkPassword('');

  for(let i=1; i<=totalQuestions; i++){
    const container = document.getElementById(`quiz${i}`);
    const feedback = document.getElementById(`feedback${i}`);
    container.querySelectorAll('.quiz-option').forEach(opt => {
      opt.classList.remove('selected','correct','incorrect');
      opt.style.pointerEvents = 'auto';
    });
    feedback.classList.remove('show');
  }

  const submitBtn = document.getElementById('submitQuizBtn');
  submitBtn.textContent = 'Enviar respostas';
  submitBtn.onclick = submitQuiz;

  document.querySelectorAll('.decision-feedback').forEach(el => {
    el.classList.remove('show','good','bad');
    el.textContent = '';
  });
  document.querySelectorAll('.chip-btn').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.quiz-dot').forEach(d => d.classList.remove('answered'));
  const qc = document.getElementById('quizAnsweredCount');
  if(qc) qc.textContent = '0';

  // Reset action checklist
  document.querySelectorAll('.action-item').forEach(el => {
    el.classList.remove('done');
    el.setAttribute('aria-checked', 'false');
  });
  localStorage.removeItem('ib_awareness_checklist');

  if(timerInterval){
    clearInterval(timerInterval);
    timerInterval = null;
  }

  updateProgress();
  window.scrollTo({ top:0, behavior:'smooth' });
}

function printCertificate(){
  window.print();
}

function bindA11yControls(){
  document.getElementById('btnMotion').addEventListener('click', toggleMotion);
  document.getElementById('btnTextPlus').addEventListener('click', () => adjustFontScale(0.05));
  document.getElementById('btnTextMinus').addEventListener('click', () => adjustFontScale(-0.05));
}

function toggleMotion(){
  const root = document.documentElement;
  const isOff = root.classList.toggle('no-motion');
  root.style.setProperty('--motion', isOff ? '0' : '1');
  localStorage.setItem('ib_awareness_motion', isOff ? '0' : '1');
  document.getElementById('btnMotion').setAttribute('aria-pressed', isOff ? 'true' : 'false');
}

function applyMotionFromPref(){
  const pref = localStorage.getItem('ib_awareness_motion');
  if(pref === '0'){
    document.documentElement.classList.add('no-motion');
    document.documentElement.style.setProperty('--motion', '0');
    document.getElementById('btnMotion').setAttribute('aria-pressed', 'true');
  }
}

function adjustFontScale(delta){
  const root = document.documentElement;
  const current = parseFloat(getComputedStyle(root).getPropertyValue('--font-scale')) || 1;
  const next = Math.min(1.25, Math.max(0.9, current + delta));
  root.style.setProperty('--font-scale', String(next));
  localStorage.setItem('ib_awareness_font', String(next));
}

function applyFontScaleFromPref(){
  const pref = localStorage.getItem('ib_awareness_font');
  if(pref){
    const val = parseFloat(pref);
    if(!Number.isNaN(val)){
      document.documentElement.style.setProperty('--font-scale', String(Math.min(1.25, Math.max(0.9, val))));
    }
  }
}
