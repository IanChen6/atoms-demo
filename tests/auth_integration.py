"""Run against a LOCAL development server: python3 tests/auth_integration.py.
Creates isolated test accounts and projects; never run against production.
"""
import urllib.request, urllib.error, http.cookiejar, json, uuid
BASE='http://localhost:3000'
def client():
 return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(c,path,data=None,expected=200,origin=BASE):
 req=urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json','Origin':origin})
 try:
  r=c.open(req);status=r.status;body=json.load(r)
 except urllib.error.HTTPError as e:
  status=e.code;raw=e.read().decode();
  try: body=json.loads(raw)
  except ValueError: body={"error":raw}
 assert status==expected,(path,status,body)
 return body
suffix=uuid.uuid4().hex[:10];a=client();b=client()
password='integration-pass-'+uuid.uuid4().hex
email='test-'+suffix+'@example.com'
assert call(a,'/api/auth')['user'] is None
call(a,'/api/studio',expected=401)
call(a,'/api/auth',{'action':'register','email':email,'name':'测试账号','password':'short'},400)
call(a,'/api/auth',{'action':'register','email':email,'name':'测试账号','password':password})
assert call(a,'/api/auth')['user']['email']==email
call(b,'/api/auth',{'action':'register','email':email,'name':'重复账号','password':password},409)
clarified=call(a,'/api/studio',{'prompt':'做一个应用'})
assert clarified['outcome']=='clarification'
clarification_project=clarified['project']
clarification_state=call(a,'/api/studio?project='+clarification_project)
assert clarification_state['versions']==[]
assert [m['role'] for m in clarification_state['messages']]==['user','assistant']
assert clarification_state['messages'][1]['status']=='clarification'
p=call(a,'/api/studio',{'prompt':'待办清单，可以添加、完成和删除任务'})['project']
project_state=call(a,'/api/studio?project='+p)
v=project_state['versions'][0]
assert [m['status'] for m in project_state['messages']]==['success','success']
call(a,'/api/project',{'action':'metadata','project':p,'title':'极简待办','description':'管理日常任务。','instructions':'输入任务并点击添加。\n点击任务切换完成状态。'})
call(a,'/api/project',{'action':'review','project':p,'version':v['id']})
saved={'atom-app-items':'[{"id":1,"text":"刷新后仍保留","done":false}]'}
assert call(a,'/api/app-data',{'project':p,'data':saved})['saved'] is True
assert call(a,'/api/app-data?project='+p)['data']==saved
published=call(a,'/api/publish',{'action':'publish','project':p,'version':v['id']})
assert published['published'] is True
assert call(a,'/api/studio?project='+p)['projects'][0]['published_version']==v['id']
call(a,'/api/studio',{'project':p,'prompt':'发布后禁止修改'},409)
assert call(a,'/api/publish',{'action':'unpublish','project':p})['published'] is False
assert call(a,'/api/studio?project='+p)['projects'][0]['published_version'] is None
f=call(a,'/api/fork',{'version':v['id']})['project'];assert f!=p
assert call(a,'/api/studio?project='+f)['versions'][0]['html']==v['html']
call(a,'/api/studio',{'project':f,'prompt':'改成深色主题'})
assert len(call(a,'/api/studio?project='+p)['versions'])==1
assert len(call(a,'/api/studio?project='+f)['versions'])==2
call(b,'/api/auth',{'action':'register','email':'other-'+suffix+'@example.com','name':'另一账号','password':password})
assert call(b,'/api/studio')['projects']==[]
call(b,'/api/studio?project='+p,expected=404)
call(b,'/api/app-data?project='+p,expected=404)
call(b,'/api/app-data',{'project':p,'data':saved},404)
call(b,'/api/publish',{'action':'publish','project':p,'version':v['id']},404)
call(b,'/api/studio',{'project':p,'prompt':'修改'},404)
call(b,'/api/fork',{'version':v['id']},404)
call(a,'/api/auth',{'action':'logout'},403,origin='https://external.example')
call(a,'/api/auth',{'action':'logout'})
call(a,'/api/studio',expected=401)
call(a,'/api/auth',{'action':'login','email':email,'password':'incorrect-password'},401)
call(a,'/api/auth',{'action':'login','email':email.upper(),'password':password})
assert len(call(a,'/api/studio')['projects'])==3
for i in range(12):
 result=call(b,'/api/auth',{'action':'login','email':'rate-'+suffix+'@example.com','password':'incorrect-password'},401 if i<10 else 429)
print('PASS: auth, chat, persistence, publish lock, isolation, branches, CSRF and rate limits')
