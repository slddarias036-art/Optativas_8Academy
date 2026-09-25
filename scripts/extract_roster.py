import openpyxl,json,re,hashlib,unicodedata,collections,pathlib,sys
source=sys.argv[1]
out=pathlib.Path('private');out.mkdir(exist_ok=True)
w=openpyxl.load_workbook(source,read_only=True,data_only=True)
rows=[]; issues=[]; counts=collections.Counter(); seen=set()
def norm(x):
 return re.sub(r'\s+',' ',re.sub(r'[^a-z0-9 ]',' ',''.join(c for c in unicodedata.normalize('NFD',x.lower()) if unicodedata.category(c)!='Mn'))).strip()
for sh in w:
 m=re.fullmatch(r'(8vo|9no|10mo|1ro|2do|3ro|3ero)\s+([A-Z])',sh.title.strip())
 if not m: issues.append({'hoja':sh.title,'error':'Hoja no reconocida'});continue
 level={'1ro':'1ero BGU','2do':'2do BGU','3ro':'3ro BGU','3ero':'3ro BGU'}.get(m[1],m[1])
 section='bachillerato' if 'BGU' in level else 'basica'
 for n,row in enumerate(sh.iter_rows(min_col=1,max_col=2,values_only=True),1):
  if not isinstance(row[0],(int,float)) or not isinstance(row[1],str):continue
  name=re.sub(r'\s+',' ',row[1]).strip()
  key=f'{level}|{m[2]}|{norm(name)}'
  sid='EST-'+hashlib.sha256(key.encode()).hexdigest()[:20]
  if sid in seen:issues.append({'hoja':sh.title,'fila':n,'error':'Duplicado exacto'});continue
  seen.add(sid);counts[level]+=1
  rows.append({'codigo_estudiante':sid,'nombreCompleto':name,'apellidos':'','nombres':'','seccion':section,'nivel':level,'paralelo':m[2],'nombreSinSeparar':True})
(out/'roster.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
report={'total':len(rows),'porNivel':dict(counts),'incidencias':issues,'sinSeparacionApellidosNombres':len(rows),'advertenciasCapacidad':[f'{l}: {c} estudiantes para 100 cupos' for l,c in counts.items() if c>100]}
pathlib.Path('docs/nomina-resumen.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
