  (() => {
    const $ = id => document.getElementById(id); const store = 'speakForward.';
    const volatileStore = new Map(); let legacyPersistent = true;
    const storage = {
      getItem(key) { if(!legacyPersistent)return volatileStore.get(key) ?? null;try { const value=localStorage.getItem(key);if(value!==null)volatileStore.set(key,value);return value; } catch { legacyPersistent = false; return volatileStore.get(key) ?? null; } },
      setItem(key,value) { volatileStore.set(key,String(value)); try { localStorage.setItem(key,value); } catch { legacyPersistent = false; $('legacyStorageNotice').hidden = false; } }
    };
    let dailyLeft = Number(storage.getItem(store+'dailyLeft') || 1800), dailyRun = false, dailyInterval;
    const format = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    function renderDaily(){ $('dailyTimer').textContent=format(dailyLeft); $('dailyProgress').style.width=`${(1-dailyLeft/1800)*100}%`; }
    function today(){ return window.SFCore.localDay(); }
    function completeDaily(){ const last=storage.getItem(store+'lastDone'); let streak=Number(storage.getItem(store+'streak')||0); const previousDate=new Date();previousDate.setDate(previousDate.getDate()-1);const yesterday=window.SFCore.localDay(previousDate); if(last!==today()) { streak=last===yesterday?streak+1:1; storage.setItem(store+'streak',streak); storage.setItem(store+'lastDone',today()); } $('streakBadge').textContent=`🔥 ${streak} day streak`; $('dailyStatus').textContent='Great work — today’s practice is complete!'; }
    function initDaily(){ const savedDay=storage.getItem(store+'dailyDate'); if(savedDay!==today()){dailyLeft=1800;storage.setItem(store+'dailyLeft',dailyLeft);storage.setItem(store+'dailyDate',today());} $('streakBadge').textContent=`🔥 ${storage.getItem(store+'streak')||0} day streak`; if(storage.getItem(store+'lastDone')===today()) {dailyLeft=0;completeDaily();} renderDaily(); }
    $('dailyToggle').onclick=()=>{ if(dailyLeft===0){dailyLeft=1800;storage.setItem(store+'dailyDate',today());renderDaily();} dailyRun=!dailyRun; $('dailyToggle').textContent=dailyRun?'Pause session':'Start session'; if(dailyRun) dailyInterval=setInterval(()=>{if(--dailyLeft<=0){dailyLeft=0;dailyRun=false;clearInterval(dailyInterval);$('dailyToggle').textContent='Start new session';completeDaily();} storage.setItem(store+'dailyLeft',dailyLeft);renderDaily();},1000); else clearInterval(dailyInterval);}; initDaily();
    const lines=['In my role, I turn complex financial data into clear decisions.','The work is demanding, but I find it genuinely rewarding.','After work, long-distance running helps me unwind and reset.','At the end of the day, consistency is crucial in both work and training.']; let line=0, repeat=false;
    function renderLine(){ $('scriptSentence').textContent=lines[line];$('sentenceIndex').textContent=line+1;$('sentenceTotal').textContent=lines.length; }
    function speak(text, loop=false){ if(!('speechSynthesis' in window)){ $('ttsNotice').textContent='Text-to-speech is not supported in this browser.';return;} speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=Number($('speed').value);u.onerror=()=>{$('ttsNotice').textContent='Audio unavailable. You can continue with the visible script.';};const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('en-us'));if(voice)u.voice=voice;u.onend=()=>{if(loop&&repeat)speak(text,true)};speechSynthesis.speak(u);}
    $('speakSentence').onclick=()=>{repeat=false;speak(lines[line]);};$('repeatSentence').onclick=()=>{repeat=!repeat;$('repeatSentence').textContent=repeat?'■ Stop repeat':'↻ Repeat';if(repeat)speak(lines[line],true);else if('speechSynthesis' in window)speechSynthesis.cancel();};$('prevSentence').onclick=()=>{line=(line+lines.length-1)%lines.length;repeat=false;renderLine();};$('nextSentence').onclick=()=>{line=(line+1)%lines.length;repeat=false;renderLine();}; renderLine();
    let past=true, answerLeft=90, answerRun=false, answerInterval, recognition;
    $('pastMode').onclick=()=>{past=!past;$('pastMode').textContent=`Past experience mode: ${past?'ON':'OFF'}`;$('pastMode').className='pill '+(past?'bg-indigo-100 text-indigo-800':'bg-slate-100');analyze();};
    $('answerTimerToggle').onclick=()=>{if(answerLeft===0)answerLeft=90;answerRun=!answerRun;$('answerTimerToggle').textContent=answerRun?'Pause':'Start 1:30';if(answerRun){answerInterval=setInterval(()=>{if(answerLeft>0)answerLeft--;else {answerRun=false;clearInterval(answerInterval);$('answerTimerToggle').textContent='Restart 1:30';} $('answerTimer').textContent=format(answerLeft);$('timeFeedback').textContent=answerLeft===0?'Time is up — review your answer.':'Target: 1:30–2:00';},1000)}else clearInterval(answerInterval);};
    const fillers=['well, let me see','to be honest','honestly speaking','what i mean is','you know','i mean','actually','in fact','at the end of the day']; const advanced=['demanding','rewarding','compliance','crucial','unwind','initiative','deadline','stakeholder','efficient','consistent']; const irregular=['went','had','felt','made','took','was','were','did','got','saw','told','thought','came','became'];
    function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
    function analyze(){const raw=$('answer').value, lower=raw.toLowerCase(), words=lower.match(/[a-z]+(?:'[a-z]+)?/g)||[], sentences=raw.split(/[.!?]+/).filter(x=>x.trim()).length;$('wordCount').textContent=words.length;$('sentenceCount').textContent=sentences;const found=fillers.map(f=>[f,(lower.match(new RegExp('\\b'+esc(f)+'\\b','g'))||[]).length]).filter(x=>x[1]);$('fillerList').innerHTML=found.length?found.map(([f,n])=>`<span class="filler">${f} × ${n}</span>`).join(' '):'None yet';const adv=advanced.filter(w=>new RegExp('\\b'+w+'\\b').test(lower));const pastWords=words.filter(w=>w.endsWith('ed')||irregular.includes(w)).length;const feedback=[];feedback.push(words.length>=100?'✓ Strong answer length.':'Add detail: aim for at least 100 words.');feedback.push(sentences>=12&&sentences<=15?'✓ Sentence count is in the target range.':`Aim for 12–15 sentences (currently ${sentences}).`);feedback.push(adv.length?`✓ Strong vocabulary: ${adv.join(', ')}.`:'Try precise vocabulary: demanding, rewarding, crucial, unwind.');if(past&&words.length)feedback.push(pastWords/words.length>=.08?'✓ Past-tense signals are present.':'For a past story, add more past verbs (e.g., went, felt, managed, completed).');if(found.reduce((n,x)=>n+x[1],0)>4)feedback.push('Use fillers sparingly so your answer stays natural.');$('scoreFeedback').innerHTML=feedback.join('<br>');}
    $('answer').addEventListener('input',()=>{
      if(recognition){stopLegacyMedia();$('sttNotice').textContent='Speech recognition stopped while editing. You can continue by typing.';}
      analyze();
    });
    $('clearAnswer').onclick=()=>{stopLegacyMedia();$('answer').value='';analyze();$('sttNotice').textContent='Answer cleared. Start speech-to-text again when ready.';};
    $('startSTT').onclick=()=>{
      document.dispatchEvent(new Event('sf-stop-media'));
      const R=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!R){$('sttNotice').textContent='Speech recognition is not available here. Please type your response.';return;}
      recognition=new R();const active=recognition;
      const current=()=>recognition===active&&!document.hidden&&!$('exam').classList.contains('hidden');
      active.lang='en-US';active.continuous=true;active.interimResults=true;
      const prefix=$('answer').value;
      active.onresult=e=>{if(!current())return;$('answer').value=window.SFCore.speechTranscript(prefix,e.results).text;analyze();};
      active.onerror=e=>{if(current())$('sttNotice').textContent=`Speech recognition: ${e.error}. You can continue by typing.`;};
      active.onend=()=>{if(current()){$('sttNotice').textContent='Speech recognition stopped. You can continue by typing.';recognition=null;}};
      try{active.start();$('sttNotice').textContent='Listening… speak in English.';}catch{stopLegacyMedia();$('sttNotice').textContent='Speech recognition could not start. Please type your response.';}
    };
    $('stopSTT').onclick=()=>{stopLegacyMedia();$('sttNotice').textContent='Speech recognition stopped. You can continue by typing.';};
    const introIds=['introHook','introJob','introHobby','introClose'];introIds.forEach(id=>{const saved=storage.getItem(store+id);if(saved)$(id).value=saved;$(id).addEventListener('input',()=>storage.setItem(store+id,$(id).value));});$('saveIntro').onclick=()=>{$('introNotice').textContent=legacyPersistent?'Saved on this device.':'Session only: browser storage is unavailable.';};$('listenIntro').onclick=()=>speak(introIds.map(id=>$(id).value).join(' '));
    let recorder, chunks=[], recordingURL, activeStream;
    function resetRecordingButtons(){ $('startRecord').disabled=false; $('stopRecord').disabled=true; }
    $('startRecord').onclick=async()=>{
      if($('startRecord').disabled)return;
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
        $('recordNotice').textContent='Recording is unavailable. Use text practice or your phone recorder.';return;
      }
      $('startRecord').disabled=true;
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});activeStream=stream;
        if(document.hidden || $('record').classList.contains('hidden')){
          stream.getTracks().forEach(track=>track.stop());resetRecordingButtons();return;
        }
        recorder=new MediaRecorder(stream);chunks=[];
        recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
        recorder.onstop=()=>{
          if(recordingURL)URL.revokeObjectURL(recordingURL);
          recordingURL=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));
          $('recording').src=recordingURL;$('recording').classList.remove('hidden');
          stream.getTracks().forEach(track=>track.stop());resetRecordingButtons();
          $('recordNotice').textContent='Recording ready. Listen for pauses, stress, and clarity.';
        };
        recorder.onerror=()=>{
          stream.getTracks().forEach(track=>track.stop());resetRecordingButtons();
          $('recordNotice').textContent='Recording failed. You can continue with text practice.';
        };
        recorder.start();$('stopRecord').disabled=false;$('recordNotice').textContent='Recording…';
      }catch{
        activeStream?.getTracks().forEach(track=>track.stop());resetRecordingButtons();
        $('recordNotice').textContent='Microphone permission was unavailable. Check your browser settings and try again.';
      }
    };
    $('stopRecord').onclick=()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();resetRecordingButtons();};
    window.addEventListener('pagehide',()=>{activeStream?.getTracks().forEach(track=>track.stop());if(recordingURL)URL.revokeObjectURL(recordingURL);});
    function stopLegacyMedia(){repeat=false;if('speechSynthesis' in window)speechSynthesis.cancel();if(recognition){const active=recognition;recognition=null;active.onresult=active.onerror=active.onend=null;try{active.abort?active.abort():active.stop();}catch{}}if(recorder?.state==='recording')recorder.stop();}
    document.addEventListener('sf-stop-media',stopLegacyMedia);
    document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',stopLegacyMedia));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLegacyMedia();});
    if(!legacyPersistent)$('legacyStorageNotice').hidden=false;
  })();
