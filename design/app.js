'use strict';

// Design fixtures only. This file does not call a model, read files, or use a network.
const paths = {
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a8.5 8.5 0 0 1 17-1"/><path d="M7 9h7M7 13h9"/>',
  library: '<path d="M4 4v16M8 4v16M12 4v16M16 5l4 14M3 20h10"/>',
  note: '<path d="M6 3h14v18H6zM3 7h5M3 12h5M3 17h5M11 7h5M11 11h5"/>',
  folder: '<path d="M3 6h6l2 2h10v12H3zM3 6V4h6l2 2h8v2"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  settings: '<path d="M5 4v16M12 4v16M19 4v16"/><path d="M2 8h6M9 16h6M16 9h6"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/><rect x="9" y="9" width="6" height="6"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  edit: '<path d="m16 3 5 5-12 12H4v-5zM13 6l5 5"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  alert: '<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
  link: '<path d="m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const sources = [
  {id:1,title:'Community archive field guide',type:'Markdown',author:'Archive working group',date:'Aug 2026',location:'Section 3 · Stewardship',description:'A working guide to collecting, describing, and caring for a neighborhood collection.',quote:'Start with a small, well-described collection. A record of who contributed an item and how it may be used is as important as the item itself.',highlight:'A record of who contributed an item and how it may be used',file:'community-archive-guide.md'},
  {id:2,title:'Conversations with the neighborhood',type:'Text',author:'Project interview notes',date:'Aug 2026',location:'Interview 04 · Access',description:'Sample interview notes about access, participation, and the stories residents want to preserve.',quote:'People want to hear the stories, but not everyone wants their name or recording online. We need a way to share some things in person only.',highlight:'not everyone wants their name or recording online',file:'neighborhood-interviews.txt'},
  {id:3,title:'A small archive, built to last',type:'Markdown',author:'Project planning notes',date:'Sep 2026',location:'Section 2 · Pilot',description:'A proposed pilot with a limited collection, clear ownership, and a monthly review.',quote:'The first collection should be small enough for one steward to review each month. Expand only when description and access reviews are keeping pace.',highlight:'small enough for one steward to review each month',file:'archive-pilot.md'},
];

const sampleAnswer = 'Begin with a small collection, preserve contributor context, and agree on access before publishing.';
const conversations = [
  {id:'archive',title:'Building a community archive',messages:[{role:'user',text:'How should we start a neighborhood archive that stays useful and in the community’s control?'},{role:'assistant',text:sampleAnswer,fixture:true,status:'complete',sources:[1,2,3],mode:'local'}],draft:'',web:false,attached:true},
  {id:'oral',title:'Preserving oral histories',messages:[{role:'user',text:'How can we preserve oral histories while respecting the people who share them?'},{role:'assistant',text:'Keep preservation and publication permissions separate. Let each contributor choose whether a recording can be shared online or only in person.',status:'complete',sources:[2],mode:'local'}],draft:'',web:false,attached:true},
  {id:'access',title:'Making collections accessible',messages:[{role:'user',text:'What should our first archive pilot focus on?'},{role:'assistant',text:'Choose a collection small enough for one steward to review each month. Keep descriptions and access decisions up to date before expanding.',status:'complete',sources:[3],mode:'local'}],draft:'',web:false,attached:true},
];
const freshConversation = () => ({id:null,title:'New conversation',messages:[],draft:'',web:false,attached:false});
let active = freshConversation();
let modelReady = true;
let sidebarCollapsed = false;
const desktopLayout = matchMedia('(min-width: 960px)');
const timers = new Map();
const main = document.querySelector('#main');
const viewport = document.querySelector('#messages');
const input = document.querySelector('#composer-input');
const dialog = document.querySelector('#dialog');
let opener;
let toastTimer;
let pendingSubmission = null;

function hydrateIcons() {
  document.querySelectorAll('[data-icon]').forEach(el=>el.replaceWith(document.createRange().createContextualFragment(icon(el.dataset.icon))));
}
function toast(message) {
  const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);
}
function openDialog(title,body,actions='',history=false) {
  if(!dialog.open)opener=document.activeElement;
  dialog.classList.toggle('history-dialog',history);
  dialog.classList.remove('history-search-dialog');
  document.querySelector('#dialog-content').innerHTML=`<div class="dialog-heading"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div>${body}${actions?`<div class="dialog-actions">${actions}</div>`:''}`;
  if(!dialog.open)dialog.showModal();
  dialog.querySelector('[data-action="close"]').focus();
}
function closeDialog(){dialog.close();}
dialog.addEventListener('close',()=>{pendingSubmission=null;if(opener?.isConnected)opener.focus();});
function historyRows(items=conversations){return `${items.map(c=>`<button class="history-row ${c===active?'active':''}" title="${escapeHTML(c.title)}" data-conversation="${c.id}" ${c===active?'aria-current="page"':''}><span>${escapeHTML(c.title)}</span></button>`).join('')}`;}
function renderHistory(){document.querySelector('#desktop-history').innerHTML=historyRows();}
function syncSidebar() {
  document.querySelector('.app-shell').classList.toggle('sidebar-collapsed',sidebarCollapsed);
  const collapse=document.querySelector('[data-action="collapse-sidebar"]');
  const search=document.querySelector('[data-action="search-history"]');
  const sidebar=document.querySelector('#history-sidebar');
  const sidebarTools=document.querySelector('.sidebar-tools');
  // Keep keyboard order aligned with the expanded toolbar or collapsed rail.
  if(sidebarCollapsed&&search.parentElement!==sidebar)sidebar.append(search);
  else if(!sidebarCollapsed&&search.parentElement!==sidebarTools)sidebarTools.prepend(search);
  collapse.setAttribute('aria-label',sidebarCollapsed?'Show sidebar':'Hide sidebar');
  collapse.title=sidebarCollapsed?'Show sidebar':'Hide sidebar';
  collapse.setAttribute('aria-expanded',String(!sidebarCollapsed));
  const button=document.querySelector('#history-button');
  button.setAttribute('aria-label',desktopLayout.matches?'Show sidebar':'Open conversation history');
  button.title=desktopLayout.matches?'Show sidebar':'Conversation history';
  button.setAttribute('aria-controls',desktopLayout.matches?'history-sidebar':'dialog');
  if(desktopLayout.matches)button.setAttribute('aria-expanded',String(!sidebarCollapsed));
  else button.removeAttribute('aria-expanded');
  button.innerHTML=icon(desktopLayout.matches?'panel':'menu');
  const more=document.querySelector('[data-action="attach"]');
  more.setAttribute('aria-label',desktopLayout.matches?'Add sources':'More options');
  more.title=desktopLayout.matches?'Add sources':'More options';
}
function setSidebarCollapsed(collapsed) {
  sidebarCollapsed=collapsed;
  syncSidebar();
  fitComposer();
  const target=document.querySelector('[data-action="collapse-sidebar"]');
  target.focus();
}
function openHistorySearch() {
  openDialog('History',`<label class="sr-only" for="history-search">Search conversations</label><div class="history-search-field">${icon('search')}<input type="search" id="history-search" placeholder="Search conversations" autocomplete="off"></div><nav id="history-results" aria-label="Conversation history">${historyRows()}</nav><span id="history-result-count" class="sr-only" role="status"></span>`,'',!desktopLayout.matches);
  dialog.classList.toggle('history-search-dialog',desktopLayout.matches);
  // Do not open the phone keyboard until the user chooses to search.
  if(desktopLayout.matches)document.querySelector('#history-search').focus();
}
function filterHistory(query) {
  const matches=conversations.filter(c=>c.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  document.querySelector('#history-results').innerHTML=matches.length?historyRows(matches):'<p class="history-empty">No conversations found.</p>';
  document.querySelector('#history-result-count').textContent=`${matches.length} ${matches.length===1?'conversation':'conversations'} found`;
}

function citation(id){return `<button class="citation" data-source="${id}" aria-label="Inspect source ${id}: ${sources[id-1].title}">[${id}]</button>`;}
function fixtureAnswer(){return `<p>${sampleAnswer}</p><h2>A practical starting framework</h2><ol class="findings"><li><strong>Keep the context.</strong> Record who contributed an item, why it matters, and how it may be used.${citation(1)}</li><li><strong>Make access a choice.</strong> Separate permission to preserve from permission to publish.${citation(2)}</li><li><strong>Start with a manageable pilot.</strong> Review the collection regularly before expanding.${citation(3)}</li></ol><div class="uncertainty">Still unresolved: who will steward the collection long term?</div>`;}
function messageHTML(message,index){
  if(message.role==='user')return `<article class="message user" aria-label="Your message">${escapeHTML(message.text)}</article>`;
  const running=message.status==='running';
  const status=running?'Working…':message.status==='stopped'?'Response stopped':message.status==='error'?'Model unavailable':'';
  return `<article class="message assistant" aria-label="Assistant response"><div class="speaker"><img class="brand-mark" src="assets/vigilante-mark.svg" alt="">Vigilante</div>${status?`<div class="run-status" role="status">${status}</div>`:''}<div class="answer-body">${message.fixture?fixtureAnswer():`<p>${escapeHTML(message.text)}</p>${message.sources?.length?`<p>${message.sources.map(citation).join('')}</p>`:''}`}</div>${!running?`<div class="answer-actions">${message.sources?.length?`<button class="text-button" data-message-sources="${index}">${icon('file')}${message.sources.length} sources</button>`:''}${message.status==='stopped'||message.status==='error'?`<button class="text-button" data-retry="${index}">${icon('refresh')}Try again</button>`:''}</div>`:''}</article>`;
}
function renderMessages(scrollEnd=false){
  const wasNearBottom=viewport.scrollHeight-viewport.scrollTop-viewport.clientHeight<80;
  const previousScroll=viewport.scrollTop;
  main.classList.toggle('empty',!active.messages.length);
  viewport.innerHTML=active.messages.length?`<div class="message-list">${active.messages.map(messageHTML).join('')}</div>`:'<div class="welcome"><h1>What do you want to know?</h1></div>';
  if(scrollEnd||wasNearBottom)viewport.scrollTop=viewport.scrollHeight;
  else viewport.scrollTop=previousScroll;
}
function fitComposer(){
  // Measure text content after resetting height so deletion can shrink the input.
  input.style.height='auto';
  const available=window.visualViewport?.height||window.innerHeight;
  const cap=Math.max(56,Math.min(192,Math.floor(available*.28)));
  const height=Math.max(32,Math.min(input.scrollHeight,cap));
  input.style.height=`${height}px`;
  input.style.overflowY=input.scrollHeight>height?'auto':'hidden';
}
function updateComposer(){
  input.value=active.draft;
  const running=active.messages.some(m=>m.status==='running');
  input.disabled=running;
  input.placeholder=active.messages.length?'Ask a follow-up…':'Ask anything…';
  const web=document.querySelector('#web-button');web.setAttribute('aria-pressed',String(active.web));web.disabled=running;
  const send=document.querySelector('#send-button');send.type=running?'button':'submit';send.setAttribute('aria-label',running?'Stop response':'Send message');send.innerHTML=icon(running?'stop':'up');send.disabled=!running&&!active.draft.trim();
  fitComposer();
}
function render(scrollEnd=false){
  document.querySelector('#conversation-title').textContent=active.title;
  renderHistory();renderMessages(scrollEnd);updateComposer();
}
function chooseConversation(id){
  active=conversations.find(c=>c.id===id)||freshConversation();
  history.replaceState(null,'',active.id?`#conversation-${active.id}`:'#new');
  if(dialog.open)closeDialog();
  render(true);viewport.focus();
}
function startNew(){
  active=freshConversation();history.replaceState(null,'','#new');render();input.focus();
}
function sourceDetails(id){
  const source=sources.find(s=>s.id===Number(id));if(!source)return;
  const quote=escapeHTML(source.quote).replace(escapeHTML(source.highlight),`<mark>${escapeHTML(source.highlight)}</mark>`);
  openDialog(source.title,`<p>${source.author} · ${source.type}</p><blockquote>“${quote}”</blockquote><p>${source.location}</p><p>Fictional source for this design preview.</p>`);
}
function chooseSources(){
  openDialog('Add sources',`<p>Try three fictional archive documents. This preview does not read files from your device.</p>${active.attached?'<p>These sources are already included in this conversation.</p>':''}`,`<button class="secondary" data-action="close">Cancel</button><button class="primary" data-action="attach-samples">Use sample sources</button>`);
}
function sourceList(ids){openDialog('Sources',ids.map(id=>{const s=sources[id-1];return `<button class="source-row" data-source="${id}"><strong>${id}. ${s.title}</strong><small>${s.type} · ${s.location}</small></button>`;}).join(''));}
function ensureHistory(conversation,question){
  if(conversation.id)return;
  conversation.id=crypto.randomUUID();conversation.title=question.length>55?question.slice(0,52)+'…':question;
  conversations.unshift(conversation);history.replaceState(null,'',`#conversation-${conversation.id}`);
}
function runResponse(conversation,response){
  if(!modelReady){response.status='error';response.text='The simulated model is unavailable. Choose a ready model in the composer, then try again.';if(active===conversation)render(true);return;}
  response.status='running';response.text=conversation.web?'Preparing a web research response…':'Considering your question…';
  if(active===conversation)render(true);
  const timer=setTimeout(()=>{
    timers.delete(conversation.id);
    response.status='complete';
    response.text=conversation.web?'This is a simulated web research response. In the product, retrieved evidence and citations appear here, in this same conversation. No web request was made.':'This is a simulated response. In the product, the assistant answers here using the conversation and any sources you included. You can continue with a follow-up in the same screen.';
    if(active===conversation){renderMessages();updateComposer();}
  },3000);
  timers.set(conversation.id,timer);
}
function submitQuestion(conversation,question){
  if(conversation.messages.some(m=>m.status==='running'))return;
  ensureHistory(conversation,question);
  conversation.messages.push({role:'user',text:question});
  const response={role:'assistant',text:'',status:'running',sources:[],mode:conversation.web?'web':'local'};
  conversation.messages.push(response);conversation.draft='';
  runResponse(conversation,response);
}
function requestSubmit(){
  const question=active.draft.trim();if(!question||active.messages.some(m=>m.status==='running'))return;
  if(!active.web){submitQuestion(active,question);return;}
  pendingSubmission={conversation:active,question};
  openDialog('Search the web?',`<p>Review what would leave this device.</p><dl><dt>Query</dt><dd>${escapeHTML(question)}</dd><dt>Destination</dt><dd>Example search provider · not connected</dd><dt>Included data</dt><dd>This query only. Local files and history are not attached.</dd></dl><p>This preview simulates the search.</p>`,`<button class="secondary" data-action="close">Cancel</button><button class="primary" data-action="allow-web">Search once</button>`);
}
function stopResponse(){
  const response=active.messages.find(m=>m.status==='running');if(!response)return;
  clearTimeout(timers.get(active.id));timers.delete(active.id);response.status='stopped';response.text+='\n\nStopped before the sample response finished.';
  active.draft=active.messages.filter(m=>m.role==='user').at(-1)?.text||'';
  renderMessages();updateComposer();input.focus();
}
const actions={
  'search-history':openHistorySearch,
  'collapse-sidebar':()=>setSidebarCollapsed(!sidebarCollapsed),
  'new-conversation':startNew,
  close:closeDialog,
  'web-toggle':()=>{active.web=!active.web;updateComposer();},
  model:()=>openDialog('Model',`<p>This design uses simulated responses.</p><label for="model-ready">Local model status</label><select id="model-ready"><option value="ready" ${modelReady?'selected':''}>Ready · simulation</option><option value="unavailable" ${!modelReady?'selected':''}>Unavailable · simulation</option></select>`),
  attach:()=>desktopLayout.matches?chooseSources():openDialog('Conversation options',`<button class="source-row" data-action="choose-sources"><strong>Add sources</strong></button><button class="source-row" data-action="model"><strong>Choose model</strong></button>`),
  'choose-sources':chooseSources,
  'attach-samples':()=>{active.attached=true;closeDialog();updateComposer();},
  'allow-web':()=>{const request=pendingSubmission;closeDialog();pendingSubmission=null;if(request)submitQuestion(request.conversation,request.question);},
};
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.conversation)chooseConversation(button.dataset.conversation);
  else if(button.dataset.source)sourceDetails(button.dataset.source);
  else if(button.dataset.messageSources!==undefined)sourceList(active.messages[Number(button.dataset.messageSources)].sources);
  else if(button.dataset.retry!==undefined){const response=active.messages[Number(button.dataset.retry)];if(!active.messages.some(m=>m.status==='running')){active.draft='';runResponse(active,response);}}
  else if(button.dataset.action)actions[button.dataset.action]?.();
});
input.addEventListener('input',()=>{active.draft=input.value;fitComposer();document.querySelector('#send-button').disabled=!active.draft.trim();});
document.querySelector('#composer-form').addEventListener('submit',event=>{event.preventDefault();requestSubmit();});
document.querySelector('#send-button').addEventListener('click',event=>{if(active.messages.some(m=>m.status==='running')){event.preventDefault();stopResponse();}});
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!matchMedia('(pointer:coarse)').matches){event.preventDefault();requestSubmit();}});
document.addEventListener('change',event=>{if(event.target.id==='model-ready')modelReady=event.target.value==='ready';});
document.querySelector('#history-button').addEventListener('click',()=>desktopLayout.matches?setSidebarCollapsed(false):openHistorySearch());
document.addEventListener('input',event=>{if(event.target.id==='history-search')filterHistory(event.target.value);});
document.addEventListener('keydown',event=>{
  if(event.target.id==='history-search'&&event.key==='Escape'){event.preventDefault();closeDialog();return;}
  if(event.target.id==='history-search'&&event.key==='Enter'&&!event.isComposing){
    event.preventDefault();
    document.querySelector('#history-results [data-conversation]')?.click();
  }
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&!dialog.open){event.preventDefault();openHistorySearch();}
});
desktopLayout.addEventListener('change',()=>{if(dialog.open&&(dialog.classList.contains('history-dialog')||dialog.classList.contains('history-search-dialog')))closeDialog();syncSidebar();});
document.querySelector('#new-button').addEventListener('click',startNew);
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='n'&&!dialog.open){event.preventDefault();startNew();}});
function syncViewport(){document.documentElement.style.setProperty('--app-height',`${window.visualViewport?.height||window.innerHeight}px`);fitComposer();}
window.addEventListener('resize',syncViewport);
window.visualViewport?.addEventListener('resize',syncViewport);
window.addEventListener('hashchange',()=>chooseConversation(location.hash.replace('#conversation-','')));
hydrateIcons();syncSidebar();syncViewport();chooseConversation(location.hash.replace('#conversation-',''));
