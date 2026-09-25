import React from 'react';
export function SheetsHost(){
 const url=import.meta.env.VITE_APPS_SCRIPT_URL;
 const valid=url&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url);
 const admin=new URLSearchParams(location.search).get('admin')==='1';
 if(admin)return <main className="login-shell"><div className="panel"><h1>Administración</h1><p>Abre la hoja privada de matrículas con tu cuenta de Google y selecciona <b>Optativas → Abrir panel administrativo</b>.</p><a className="primary" href={import.meta.env.BASE_URL}>Volver a inscripción</a></div></main>;
 if(!valid)return <main className="login-shell"><div className="panel"><span className="eyebrow">EIGHT ACADEMY · OPTATIVAS</span><h1>Inscripciones en preparación</h1><p>El registro en línea todavía no está habilitado.</p><p>Tu colegio te informará cuándo puedes elegir tu materia.</p></div></main>;
 return <div style={{height:'100dvh',display:'flex',flexDirection:'column'}}><iframe title="Inscripción de materias optativas" src={url} style={{border:0,width:'100%',flex:1}} allow="clipboard-write"/><div style={{padding:'10px',textAlign:'center',fontSize:'14px',background:'#fff'}}><a href={url} target="_blank" rel="noreferrer">¿No se carga el formulario? Abrir inscripción en otra pestaña</a></div></div>;
}
