#!/bin/bash
set +e
EMAIL="diag+$(date +%s)@webcraft.test"
PASS="password123"
curl -s -X POST http://localhost:3084/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"T\"}" >/dev/null
agent-browser open http://localhost:3084/login >/dev/null 2>&1; sleep 2
agent-browser find label "Email" fill "$EMAIL" >/dev/null 2>&1
agent-browser find label "Password" fill "$PASS" >/dev/null 2>&1
agent-browser find role button click --name "Sign in" >/dev/null 2>&1; sleep 3
agent-browser find role button click --name "New Website" >/dev/null 2>&1; sleep 2
agent-browser find label "Business name" fill "Diag Co" >/dev/null 2>&1
agent-browser eval "Array.from(document.querySelectorAll('button[type=submit]')).find(b=>b.textContent.includes('Generate Website'))?.click()" >/dev/null 2>&1
for i in $(seq 1 75); do url=$(agent-browser get url 2>/dev/null|tail -1); echo "$url"|grep -q "/editor/" && break; sleep 2; done
sleep 3
agent-browser set viewport 1440 900 >/dev/null 2>&1
# select hero
agent-browser eval "Array.from(document.querySelectorAll('[data-node]')).find(e=>e.querySelector('h1,h2')&&e.textContent.length>50)?.click();'sel'" >/dev/null 2>&1
sleep 1
# open ask ai
agent-browser eval "Array.from(document.querySelectorAll('button')).find(b=>b.title==='Ask AI')?.click();'open'" >/dev/null 2>&1
sleep 2
echo "=== dialog HTML structure ==="
agent-browser eval "(function(){const d=document.querySelector('[role=dialog]'); if(!d)return'NO DIALOG'; return d.outerHTML.slice(0,1500)})()" 2>&1 | tail -5
echo ""
echo "=== try setting textarea via native input event ==="
agent-browser eval "(function(){const ta=document.querySelector('textarea'); if(!ta)return'no-ta'; const setter=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set; setter.call(ta,'Rewrite the headline to be more premium'); ta.dispatchEvent(new Event('input',{bubbles:true})); return 'set: '+ta.value})()" 2>&1 | tail -2
echo "=== click Generate ==="
agent-browser eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Generate'))?.click();'gen'" >/dev/null 2>&1
echo "=== wait + check for loading ==="
sleep 2
agent-browser eval "(function(){return document.body.innerText.includes('AI is working')?'LOADING':'idle: '+document.body.innerText.slice(0,100)})()" 2>&1 | tail -1
echo "=== wait for response ==="
for i in $(seq 1 60); do r=$(agent-browser eval "document.body.innerText.includes('AI suggestion')?'READY':'WAIT'" 2>/dev/null|tail -1); [ "$r" = "READY" ] && { echo "ready ${i}s"; break; }; sleep 1; done
echo "=== dialog innerText (full) ==="
agent-browser eval "(function(){const d=document.querySelector('[role=dialog]'); return d?d.innerText.slice(0,800):'no-dialog'})()" 2>&1 | tail -15
echo "=== network requests to /edit ==="
agent-browser network requests --filter "sections" 2>&1 | tail -5
echo "=== console errors ==="
agent-browser errors 2>&1 | tail -10
