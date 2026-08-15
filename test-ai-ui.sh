#!/bin/bash
set +e
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null; sleep 1
nohup bun run dev </dev/null >dev.log 2>&1 &
SRV=$!
for i in $(seq 1 40); do c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3084/ 2>/dev/null); [ "$c" = "200" ] && break; sleep 1; done

EMAIL="test+$(date +%s)@webcraft.test"; PASS="password123"
curl -s -X POST http://localhost:3084/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"T\"}" >/dev/null
agent-browser open http://localhost:3084/login >/dev/null 2>&1; sleep 2
agent-browser find label "Email" fill "$EMAIL" >/dev/null 2>&1
agent-browser find label "Password" fill "$PASS" >/dev/null 2>&1
agent-browser find role button click --name "Sign in" >/dev/null 2>&1; sleep 3
agent-browser wait --url "/dashboard" >/dev/null 2>&1
agent-browser find role button click --name "New Website" >/dev/null 2>&1; sleep 2
agent-browser find label "Business name" fill "Acme Marketing" >/dev/null 2>&1
agent-browser eval "Array.from(document.querySelectorAll('button[type=submit]')).find(b=>b.textContent.includes('Generate Website'))?.click()" >/dev/null 2>&1
for i in $(seq 1 75); do url=$(agent-browser get url 2>/dev/null|tail -1); echo "$url"|grep -q "/editor/" && break; sleep 2; done
sleep 4
agent-browser set viewport 1440 900 >/dev/null 2>&1

echo "=== 1. Select Hero ==="
agent-browser eval "Array.from(document.querySelectorAll('[data-node]')).find(e=>e.querySelector('h1,h2')&&e.textContent.length>50)?.click()" >/dev/null 2>&1
sleep 1
echo "=== 2. Ask AI button present? ==="
agent-browser eval "!!Array.from(document.querySelectorAll('button[title=Ask AI]')).length" 2>&1 | tail -1

echo "=== 3. Click Ask AI ==="
agent-browser click "$(agent-browser eval "JSON.stringify(Array.from(document.querySelectorAll('button[title=Ask AI]')).map((b,i)=>({ref:'e'+i,b:b}))" 2>/dev/null >/dev/null; echo 'skip')" >/dev/null 2>&1
# simpler: use find
agent-browser find role button click --name "Ask AI" >/dev/null 2>&1 || agent-browser eval "document.querySelector('button[title=Ask AI]')?.click()" >/dev/null 2>&1
sleep 2

echo "=== 4. Dialog shows 'Editing: Hero'? ==="
agent-browser wait --text "AI Assistant" --timeout 5000 >/dev/null 2>&1
agent-browser eval "var d=document.querySelector('[role=dialog]'); d && d.innerText.includes('Editing:') && d.innerText.includes('Hero') ? 'DIALOG_OK' : 'DIALOG_FAIL:'+ (d?d.innerText.slice(0,150):'no-dialog')" 2>&1 | tail -1

echo "=== 5. Fill instruction via native fill (triggers React onChange) ==="
agent-browser find role textbox fill --name "What would you like to change?" "Make the headline more conversion focused." >/dev/null 2>&1
sleep 1
agent-browser eval "var ta=document.querySelector('textarea'); ta? ta.value : 'no-textarea'" 2>&1 | tail -1

echo "=== 6. Click Generate ==="
agent-browser find role button click --name "Generate" >/dev/null 2>&1 || agent-browser eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Generate')?.click()" >/dev/null 2>&1
sleep 2
echo "=== 7. Loading state? ==="
agent-browser eval "document.body.innerText.includes('AI is working') ? 'LOADING_OK' : 'NO_LOADING'" 2>&1 | tail -1

echo "=== 8. Wait for AI suggestion (60s) ==="
agent-browser wait --text "AI suggestion" --timeout 60000 >/dev/null 2>&1 && echo "RESPONSE_OK" || echo "RESPONSE_TIMEOUT"

echo "=== 9. Verify summary + badges ==="
agent-browser eval "var d=document.querySelector('[role=dialog]'); var t=d?d.innerText:''; 'summary='+(t.includes('AI suggestion'))+', badge_updated='+(t.includes('section updated'))+', badge_mode='+(t.includes('Mode: Merge'))+', placeholder='+(t.includes('Apply will be added next'))" 2>&1 | tail -1

echo "=== 10. Print the actual summary text ==="
agent-browser eval "var d=document.querySelector('[role=dialog]'); if(!d)'no-dialog'; var m=d.innerText.match(/AI suggestion[\\s\\S]{1,300}/); m?m[0].slice(0,300):'no-match'" 2>&1 | tail -2

echo "=== 11. Verify /edit API was called ==="
agent-browser network requests --filter "sections" 2>&1 | tail -3

echo "=== 12. Close dialog via close button ==="
agent-browser find role button click --name "Close" >/dev/null 2>&1 || agent-browser press Escape >/dev/null 2>&1
sleep 2
agent-browser eval "document.querySelector('[role=dialog]') ? 'STILL_OPEN' : 'CLOSED'" 2>&1 | tail -1

echo "=== 13. Console errors ==="
agent-browser errors 2>&1 | tail -8

kill $SRV 2>/dev/null
echo "DONE"
