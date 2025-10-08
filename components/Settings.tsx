import React, { useState, useEffect } from 'react';
import { getUsers, addUser, deleteUser } from '../api';
import type { User } from '../types';
import { CURRENT_APP_VERSION } from '../config';
import { LogoutIcon, SpinnerIcon, UsersIcon, ClipboardIcon, CloudDownloadIcon, CheckCircleIcon, ExclamationCircleIcon, DownloadIcon } from './icons';

// --- EMBEDDED STATIC SITE CODE ---
// This is a pre-bundled version of the application for easy, reliable deployment.
const HTML_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Attendance</title>
    <link rel="icon" href="https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>if (typeof global === 'undefined') { var global = window; }</script>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <style>
      @media screen { #print-root { display: none; } }
      @media print {
        @page { size: A4; margin: 1cm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body > #root { display: none; }
        #print-root { display: block; }
        .id-card-print-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; justify-items: center; }
        .portrait-card { width: 54mm; height: 85.6mm; border: 1px dashed #ccc; page-break-inside: avoid; overflow: hidden; }
        .landscape-card { width: 85.6mm; height: 54mm; border: 1px dashed #ccc; page-break-inside: avoid; overflow: hidden; }
      }
    </style>
</head>
<body>
    <div id="root"></div>
    <div id="print-root"></div>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossOrigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossOrigin></script>
    <script>var QRCode={default:window.QRCode};</script>
    <script src="https://cdn.jsdelivr.net/npm/qrcode.react@3.1.0/dist/qrcode.react.min.js"></script>
    <script>
      window.React=React;
      window.ReactDOM=ReactDOM;
      window.QRCodeReact=QRCode.default;
      window.Html5Qrcode=Html5Qrcode;
    </script>
    <script src="bundle.js" defer></script>
</body>
</html>`;

const JS_BUNDLE_CODE = `var app=(()=>{var T={432:e=>{e.exports=React},724:e=>{e.exports=ReactDOM},648:e=>{e.exports=QRCodeReact}},S={};function r(e){var t=S[e];if(void 0!==t)return t.exports;var n=S[e]={exports:{}};return T[e](n,n.exports,r),n.exports}r.d=(e,t)=>{for(var n in t)r.o(t,n)&&!r.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},r.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var t={};return(()=>{r.r(t),r.d(t,{default:()=>Ne});var e=r(432),n=r.d(e,e),o=r(724);const a=async(e,t,n={})=>{const o=new Headers(n.headers||{});o.set("Content-Type","application/json"),o.set("X-Sync-Key",t);const a=await fetch("https://ponsrischool.in/wp-json/custom-sync/v1".concat(e),{...n,headers:o});if(!a.ok){const e=await a.json().catch(()=>({message:a.statusText}));throw new Error(e.message||"An unknown API error occurred")}const s=await a.text();return s?JSON.parse(s):null},s=async e=>await a("/data",e,{method:"GET"}),i=async(e,t)=>{const n=e.map((e=>({id:e.id,timestamp:e.timestamp.toISOString()})));return await a("/attendance",t,{method:"POST",body:JSON.stringify({students:n})}),!0},c=async(e,t)=>{await a("/attendance",t,{method:"POST",body:JSON.stringify({teachers:e})})},l=e=>e&&"null"!==e.toLowerCase()?e.split("=>").map((e=>e.trim())).length>=2&&e.split("=>").map((e=>e.trim()))[0]&&e.split("=>").map((e=>e.trim()))[1]?"Class ".concat(e.split("=>").map((e=>e.trim()))[0],"-").concat(e.split("=>").map((e=>e.trim()))[1]):1===e.split("=>").map((e=>e.trim())).length&&e.split("=>").map((e=>e.trim()))[0]?"Class ".concat(e.split("=>").map((e=>e.trim()))[0]):e.split("=>")[0]||"N/A":"N/A",d=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 4v1m6 11h2m-6.5 6.5v2M4.5 12.5h-2M18 18.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM8.5 18.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM18.5 8.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8.5 8.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 4h4v4H4V4zM4 16h4v4H4v-4zM16 4h4v4h-4V4zM16 16h4v4h-4v-4z"})),p=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"}),e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M15 13a3 3 0 11-6 0 3 3 0 016 0z"})),u=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M5 5h14v14H5V5z"})),m=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"})),h=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})),g=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"})),f=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"})),b=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 006-6v-1a3 3 0 00-3-3H9a3 3 0 00-3 3v1a6 6 0 006 6z"})),v=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h4a2 2 0 012 2v1m-4 0h4m-9 4h2m-2 4h4m-4 4h4m4-8h4m-4 4h4m-4 4h4"})),w=({className:t})=>e.createElement("svg",{className:"animate-spin ".concat(t),xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24"},e.createElement("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),e.createElement("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})),y=({className:t})=>e.createElement("img",{src:"https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download-300x300.png",alt:"Ponsri School Logo",className:t}),k=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"}),e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M15 12a3 3 0 11-6 0 3 3 0 016 0z"})),_=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"})),C=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"})),E=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M5.636 5.636a9 9 0 1012.728 0M12 3v9"})),j=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M19 9l-7 7-7-7"})),x=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})),R=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"})),I=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 4v16m8-8H4"})),A=({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"})),P=({onScanSuccess:t,onScanError:n})=>{const o=e.useRef(null);return e.useEffect((()=>{o.current||(o.current=new window.Html5QrcodeScanner("qr-reader",{fps:10,qrbox:{width:250,height:250},supportedScanTypes:[0]},!1)),o.current.render(t,n);const e=()=>{o.current&&2===o.current.getState()&&o.current.clear().catch((e=>{console.error("Failed to clear html5-qrcode-scanner.",e)}))};return ()=>e()}),[]),e.createElement("div",{id:"qr-reader",className:"w-full max-w-md mx-auto"})};const L=({records:t})=>e.createElement("div",{className:"w-full bg-white rounded-lg shadow-lg overflow-hidden"},e.createElement("div",{className:"p-4 sm:p-6 border-b border-slate-200"},e.createElement("h3",{className:"text-lg font-semibold text-slate-800"},"Attendance Log (",t.length,")")),0===t.length?e.createElement("div",{className:"text-center text-slate-500 py-16 px-6"},e.createElement("p",{className:"font-semibold"},"No students marked present yet."),e.createElement("p",{className:"text-sm mt-1"},"Start the scanner to begin taking attendance.")):e.createElement("div",{className:"max-h-[28rem] overflow-y-auto"},e.createElement("table",{className:"min-w-full"},e.createElement("thead",{className:"bg-slate-50 sticky top-0"},e.createElement("tr",null,e.createElement("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},"Student"),e.createElement("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},"Time"))),e.createElement("tbody",{className:"divide-y divide-slate-200"},t.map((t=>e.createElement("tr",{key:t.id,className:"hover:bg-slate-50 transition-colors"},e.createElement("td",{className:"px-6 py-4 whitespace-nowrap"},e.createElement("div",{className:"flex items-center space-x-3"},e.createElement("div",{className:"flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"},e.createElement(m,{className:"w-6 h-6 text-green-600"})),e.createElement("div",null,e.createElement("div",{className:"text-sm font-medium text-slate-900"},t.name),e.createElement("div",{className:"text-xs text-slate-500"},"ID: ",t.id)))),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-600"},t.timestamp.toLocaleTimeString()))))))));const D=({records:t})=>e.createElement("div",{className:"w-full bg-white rounded-lg shadow-lg overflow-hidden"},0===t.length?e.createElement("div",{className:"text-center text-slate-500 py-16 px-6"},e.createElement("p",{className:"font-semibold"},"No teachers marked present yet."),e.createElement("p",{className:"text-sm mt-1"},"Scan a teacher's QR code to mark them present.")):e.createElement("div",{className:"max-h-[28rem] overflow-y-auto"},e.createElement("table",{className:"min-w-full"},e.createElement("thead",{className:"bg-slate-50 sticky top-0"},e.createElement("tr",null,e.createElement("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},"Teacher"),e.createElement("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},"Comment"))),e.createElement("tbody",{className:"divide-y divide-slate-200"},t.map((t=>e.createElement("tr",{key:t.teacherId,className:"hover:bg-slate-50 transition-colors"},e.createElement("td",{className:"px-6 py-4 whitespace-nowrap"},e.createElement("div",{className:"flex items-center space-x-3"},e.createElement("div",{className:"flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"},e.createElement(m,{className:"w-6 h-6 text-green-600"})),e.createElement("div",null,e.createElement("div",{className:"text-sm font-medium text-slate-900"},t.teacherName),e.createElement("div",{className:"text-xs text-slate-500"},"ID: ",t.teacherId)))),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-600"},t.comment))))))));const N=({onSync:t})=>{const[n,o]=e.useState(!1),[s,i]=e.useState(null);return e.createElement("div",{className:"w-full p-6 bg-white rounded-lg shadow-lg space-y-6"},e.createElement("h3",{className:"text-lg font-semibold text-slate-800 border-b pb-3"},"Data Management"),e.createElement("div",{className:"space-y-2"},e.createElement("h4",{className:"font-semibold text-md text-slate-700"},"Server Sync"),e.createElement("div",{className:"flex flex-col sm:flex-row gap-4 items-center"},e.createElement("button",{onClick:async()=>{o(!0),await t(),o(!1),i((new Date).toLocaleTimeString())},disabled:n,className:"w-full sm:w-auto flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:bg-slate-100 disabled:cursor-wait transition-colors"},n?e.createElement(e.Fragment,null,e.createElement(w,{className:"w-5 h-5 mr-2"})," Syncing..."):e.createElement(e.Fragment,null,e.createElement((({className:t})=>e.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",className:t,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2},e.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M4 4v5h5M20 20v-5h-5M4 4a14.95 14.95 0 0114.364 2.636m0 0A15.05 15.05 0 0120 20m-1.636-13.364A14.95 14.95 0 015.636 17.364m0 0A15.05 15.05 0 014 4"}))),{className:"w-5 h-5 mr-2"})," Refresh Data")),s&&e.createElement("p",{className:"text-xs text-slate-500"},"Last synced at ",s))))},O=({teachers:t,attendance:n,onAttendanceChange:o,onSubmit:a})=>{const[s,i]=e.useState((new Date).toISOString().split("T")[0]),[l,d]=e.useState(!1);return e.createElement("div",{className:"bg-white rounded-lg shadow-lg"},e.createElement("div",{className:"p-4 border-b space-y-4 md:flex md:items-center md:justify-between md:space-y-0"},e.createElement("h2",{className:"text-xl font-semibold text-slate-800"},"Manual Teacher Attendance"),e.createElement("div",{className:"flex items-center gap-4"},e.createElement("input",{type:"date",value:s,onChange:e=>i(e.target.value),className:"px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"}),e.createElement("button",{onClick:async()=>{d(!0);const e=t.map((e=>{const t=n.get(e.id)||{status:"Present",comment:""};return{teacherId:e.id,teacherName:e.name,date:s,status:t.status,comment:t.comment}}));await a(e),d(!1)},disabled:0===t.length||l,className:"inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:bg-indigo-500 disabled:cursor-wait"},l?e.createElement(e.Fragment,null,e.createElement(w,{className:"w-5 h-5 mr-2"}),"Submitting..."):e.createElement(e.Fragment,null,"Submit")))),e.createElement("div",{className:"overflow-x-auto max-h-96"},e.createElement("table",{className:"min-w-full divide-y divide-slate-200"},e.createElement("thead",{className:"bg-slate-50 sticky top-0"},e.createElement("tr",null,e.createElement("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},"Teacher"),e.createElement("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},"Attendance"),e.createElement("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},"Comment"))),e.createElement("tbody",{className:"bg-white divide-y divide-slate-200"},0===t.length?e.createElement("tr",null,e.createElement("td",{colSpan:3,className:"text-center text-slate-500 py-8"},"No teacher data found.")):t.map((t=>{const a=n.get(t.id)||{status:"Present",comment:""};return e.createElement("tr",{key:t.id},e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"},t.name),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},e.createElement("select",{name:"attendance-".concat(t.id),value:a.status,onChange:e=>{const n=e.target.value;o((e=>{const o=new Map(e),a=o.get(t.id)||{status:"Present",comment:""};return o.set(t.id,{status:n,comment:a.comment}),o}))},className:"w-full p-1 border-slate-300 rounded-md shadow-sm focus:ring-indigo-600 focus:border-indigo-600"},["Present","Absent","Late","Half Day"].map((t=>e.createElement("option",{key:t,value:t},t))))),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},e.createElement("input",{type:"text",value:a.comment,onChange:e=>{const n=e.target.value;o((e=>{const o=new Map(e),a=o.get(t.id)||{status:"Present",comment:""};return o.set(t.id,{status:a.status,comment:n}),o}))},className:"w-full max-w-xs px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"})))}))))))};const F=({title:t,onClose:n,children:o})=>e.createElement("div",{className:"fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300","aria-labelledby":"modal-title",role:"dialog","aria-modal":!0},e.createElement("div",{className:"bg-white rounded-xl shadow-2xl max-w-lg w-full mx-auto transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale",role:"document"},e.createElement("div",{className:"p-5 border-b border-slate-200 flex justify-between items-center"},e.createElement("h3",{className:"text-lg font-semibold text-slate-800 flex items-center gap-2",id:"modal-title"},e.createElement(x,{className:"w-6 h-6 text-indigo-600"}),t),e.createElement("button",{onClick:n,className:"text-slate-400 hover:text-slate-800 text-2xl leading-none font-bold","aria-label":"Close"},"×")),e.createElement("div",{className:"p-6 text-slate-600 space-y-4"},o),e.createElement("div",{className:"bg-slate-50 px-6 py-4 rounded-b-xl flex justify-end"},e.createElement("button",{type:"button",onClick:n,className:"w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-indigo-700 text-base font-medium text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 sm:text-sm"},"OK"))),e.createElement("style",null,"\n                @keyframes fade-in-scale {\n                    from { opacity: 0; transform: scale(0.95); }\n                    to { opacity: 1; transform: scale(1); }\n                }\n                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }\n            "));const M=({people:t,type:n,orientation:o})=>{const a="portrait"===o?"portrait-card":"landscape-card";return e.createElement("div",{className:"id-card-print-container"},t.map((t=>e.createElement("div",{key:"student"===n?t.studentId:t.id,className:a},e.createElement(q,{person:t,type:n}))))))},q=({person:t,type:n})=>{let o,a,s,i;if("student"===n){const e=t;o=e.studentName,a=e.studentId,s=e.profilePhotoUrl,i=e.createElement(e.Fragment,null,e.createElement(B,{label:"Class",value:l(e.class)}),e.createElement(B,{label:"Roll No.",value:e.rollNumber}),e.createElement(B,{label:"Contact No.",value:e.contactNumber}))}else{const e=t;o=e.name,a=e.id,s=e.profilePhotoUrl,i=e.createElement(e.Fragment,null,e.createElement(B,{label:"Role",value:e.role}),e.createElement(B,{label:"Mobile",value:e.phone}),e.createElement(B,{label:"Email",value:e.email}))}const c=JSON.stringify({id:a,name:o,type:n}),d=s?.replace(/^http:\\/\\//i,"https://");return e.createElement("div",{className:"bg-white w-full h-full flex flex-col font-sans border border-slate-300 overflow-hidden"},e.createElement("header",{className:"flex items-center gap-2 p-1 bg-indigo-700 text-white shrink-0"},e.createElement("img",{src:"https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download.png",alt:"Ponsri School Logo",className:"w-8 h-8 bg-white rounded-full p-0.5"}),e.createElement("h2",{className:"text-xs font-bold leading-tight uppercase text-center flex-grow"},"PM SHRI PRATHMIK VIDHYAMANDIR PONSRI")),e.createElement("main",{className:"flex-grow p-1.5 flex flex-row items-stretch gap-2"},e.createElement("div",{className:"w-[75px] flex flex-col items-center justify-between"},e.createElement("div",{className:"w-[75px] h-[75px] border-2 border-indigo-300 p-0.5 rounded-md bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0"},d?e.createElement("img",{src:d,alt:o,className:"w-full h-full object-cover"}):e.createElement(f,{className:"w-12 h-12 text-slate-400"})),e.createElement("div",{className:"flex flex-col items-center"},e.createElement(r(648).QRCodeSVG,{value:c,size:70,level:"H",bgColor:"#FFFFFF",fgColor:"#000000"}))),e.createElement("div",{className:"flex-grow flex flex-col justify-center border-l pl-2 border-slate-200"},e.createElement("h3",{className:"text-sm font-extrabold text-slate-800 uppercase leading-tight mb-2"},o),e.createElement("div",{className:"space-y-1.5"},e.createElement(B,{label:"Student Name",value:o}),i))))},B=({label:t,value:n})=>e.createElement("div",{className:"flex text-[10px] leading-snug"},e.createElement("span",{className:"w-20 font-medium text-slate-600 shrink-0"},t),e.createElement("span",{className:"font-semibold text-slate-800 break-words"},": ",n||"N/A"));const U=({students:t,teachers:n})=>{const[a,s]=e.useState("students"),[i,c]=e.useState("all"),[d,p]=e.useState(!1),[u,m]=e.useState("portrait");const h=e.useMemo((()=>t.filter((e=>e.class&&""!==e.class.trim()&&"null"!==e.class.toLowerCase()))),[t]),g=document.getElementById("print-root"),b=e.useMemo((()=>{if("students"!==a)return null;const e=h.reduce(((e,t)=>{const n=l(t.class);return e[n]||(e[n]=[]),e[n].push(t),e}),{});return Object.fromEntries(Object.entries(e).sort((([e],[t])=>e.localeCompare(t))))}),[h,a]);e.useEffect((()=>{c("all")}),[a]);const w=e.useMemo((()=>"teachers"===a?n:"all"===i?h:b?.[i]||[]),[a,i,h,b,n]),y="students"===a?"student":"teacher",k=["Photo","ID","Name","Class","Roll No.","Contact"],_=["Photo","ID","Name","Role","Email","Phone"];return e.createElement(e.Fragment,null,d&&e.createElement(F,{title:"How to Change Profile Photos",onClose:()=>p(!1)},e.createElement("p",null,"Profile photos are managed by the School Management plugin within your WordPress dashboard."),e.createElement("p",null,"To change a student or teacher's photo, please log in to your WordPress admin account, navigate to the user's profile, and upload a new avatar there. The changes will appear in this app after the next data sync.")),e.createElement("div",{className:"bg-white rounded-lg shadow-lg"},e.createElement("div",{className:"p-4 border-b flex flex-col sm:flex-row justify-between items-start gap-4"},e.createElement("div",{className:"flex items-center gap-4"},e.createElement("div",{className:"sm:hidden"},e.createElement("select",{id:"tabs-mobile",name:"tabs-mobile",className:"block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md",onChange:e=>s(e.target.value),value:a},e.createElement("option",{value:"students"},"Students"),e.createElement("option",{value:"teachers"},"Teachers"))),e.createElement("div",{className:"hidden sm:block"},e.createElement("nav",{className:"flex space-x-4","aria-label":"Tabs"},e.createElement("button",{onClick:()=>s("students"),className:"px-3 py-2 font-medium text-sm rounded-md flex items-center gap-2 ".concat("students"===a?"bg-indigo-100 text-indigo-700":"text-slate-500 hover:text-slate-700")},e.createElement(b,{className:"w-5 h-5"})," Students (",h.length,")"),e.createElement("button",{onClick:()=>s("teachers"),className:"px-3 py-2 font-medium text-sm rounded-md flex items-center gap-2 ".concat("teachers"===a?"bg-indigo-100 text-indigo-700":"text-slate-500 hover:text-slate-700")},e.createElement(f,{className:"w-5 h-5"})," Teachers (",n.length,")")))),e.createElement("div",{className:"flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto"},e.createElement("div",{className:"flex-grow flex flex-col gap-2"},"students"===a&&b&&e.createElement("select",{value:i,onChange:e=>c(e.target.value),className:"block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md"},e.createElement("option",{value:"all"},"Print All Classes"),Object.keys(b).map((t=>e.createElement("option",{key:t,value:t},"Print ".concat(t))))),e.createElement("div",{className:"flex items-center space-x-4"},e.createElement("span",{className:"text-sm font-medium text-slate-700"},"Orientation:"),e.createElement("div",{className:"flex items-center"},e.createElement("input",{id:"portrait",name:"orientation",type:"radio",checked:"portrait"===u,onChange:()=>m("portrait"),className:"focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"}),e.createElement("label",{htmlFor:"portrait",className:"ml-2 block text-sm text-gray-900"},"Portrait")),e.createElement("div",{className:"flex items-center"},e.createElement("input",{id:"landscape",name:"orientation",type:"radio",checked:"landscape"===u,onChange:()=>m("landscape"),className:"focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"}),e.createElement("label",{htmlFor:"landscape",className:"ml-2 block text-sm text-gray-900"},"Landscape")))),e.createElement("button",{onClick:()=>{setTimeout((()=>window.print()),100)},className:"inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 flex-shrink-0 h-full"},e.createElement(v,{className:"w-5 h-5"}),"Print ID Cards"))),e.createElement("div",{className:"overflow-x-auto max-h-[32rem]"},e.createElement("table",{className:"min-w-full divide-y divide-slate-200"},e.createElement("thead",{className:"bg-slate-50 sticky top-0 z-10"},e.createElement("tr",null,("students"===a?k:_).map((t=>e.createElement("th",{key:t,scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},e.createElement("div",{className:"flex items-center gap-1"},t,"Photo"===t&&e.createElement("button",{onClick:()=>p(!0),title:"How to change photos"},e.createElement(x,{className:"w-4 h-4 text-slate-400 hover:text-indigo-600"})))))))),e.createElement("tbody",{className:"bg-white divide-y divide-slate-200"},"students"===a?b&&Object.keys(b).length>0?Object.keys(b).map((t=>{const n=b[t];return e.createElement(e.Fragment,{key:t},e.createElement("tr",{className:"bg-slate-100"},e.createElement("th",{colSpan:k.length,className:"px-6 py-2 text-left text-sm font-semibold text-slate-700 sticky top-12 bg-slate-100"},t)),n.map((t=>((t,n)=>{const o=t.profilePhotoUrl?.replace(/^http:\\/\\//i,"https://"),a=e.createElement("td",{className:"px-6 py-2"},e.createElement("div",{className:"w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden ring-2 ring-white"},o?e.createElement("img",{src:o,alt:"student"===n?t.studentName:t.name,className:"w-full h-full object-cover"}):e.createElement(f,{className:"w-6 h-6 text-slate-400"})));if("students"===s&&"studentId"in t){const n=t;return e.createElement("tr",{key:n.studentId},a,e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.studentId),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"},n.studentName),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},l(n.class)),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.rollNumber),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.contactNumber))}if("teachers"===s&&"id"in t){const n=t;return e.createElement("tr",{key:n.id},a,e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.id),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"},n.name),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.role),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.email),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.phone))}return null})(t,y))))}))):e.createElement("tr",null,e.createElement("td",{colSpan:k.length,className:"text-center text-slate-500 py-8"},"No student data available.")):n.length>0?n.map((t=>((t,n)=>{const o=t.profilePhotoUrl?.replace(/^http:\\/\\//i,"https://"),a=e.createElement("td",{className:"px-6 py-2"},e.createElement("div",{className:"w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden ring-2 ring-white"},o?e.createElement("img",{src:o,alt:"student"===n?t.studentName:t.name,className:"w-full h-full object-cover"}):e.createElement(f,{className:"w-6 h-6 text-slate-400"})));if("students"===s&&"studentId"in t){const n=t;return e.createElement("tr",{key:n.studentId},a,e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.studentId),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"},n.studentName),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},l(n.class)),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.rollNumber),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.contactNumber))}if("teachers"===s&&"id"in t){const n=t;return e.createElement("tr",{key:n.id},a,e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.id),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"},n.name),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.role),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.email),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-500"},n.phone))}return null})(t,y))):e.createElement("tr",null,e.createElement("td",{colSpan:_.length,className:"text-center text-slate-500 py-8"},"No teacher data available."))))),g&&o.createPortal(e.createElement(M,{people:w,type:y,orientation:u}),g))}))},V="2.2";const G=async()=>{try{const e=await(await fetch("https://api.github.com/repos/Preet3627/Attendance-Management-System/releases/latest")).json();return{latestVersion:e.tag_name.replace("v",""),releaseUrl:e.html_url}}catch(e){throw new Error("Could not connect to GitHub.")}},z=()=>{const[t,n]=e.useState("checking"),[o,a]=e.useState(null),[s,i]=e.useState(null);return e.useEffect((()=>{G().then((({latestVersion:e,releaseUrl:t})=>{a(e),i(t),n(e===V?"latest":"stale")})).catch((e=>{n("error")}))}),[]),e.createElement("div",null,e.createElement("h4",{className:"font-semibold text-md text-slate-700"},"Update Status"),e.createElement("div",{className:"mt-2 p-4 rounded-md ".concat("checking"===t?"bg-slate-100":"latest"===t?"bg-green-100":"bg-yellow-100")},e.createElement("div",{className:"flex items-center gap-3"},"checking"===t&&e.createElement(w,{className:"w-5 h-5 text-slate-500"}),"latest"===t&&e.createElement(m,{className:"w-5 h-5 text-green-600"}),"stale"===t&&e.createElement(h,{className:"w-5 h-5 text-yellow-600"}),"error"===t&&e.createElement(h,{className:"w-5 h-5 text-red-600"}),e.createElement("div",null,e.createElement("p",{className:"text-sm font-medium ".concat("latest"===t?"text-green-800":"stale"===t?"text-yellow-800":"error"===t?"text-red-800":"text-slate-700")},"checking"===t?"Checking for updates...":"latest"===t?"You are up to date!":"stale"===t?"Update Available":"error"===t&&"Could not check for updates"),"latest"===t&&e.createElement("p",{className:"text-xs text-green-700"},"App Version: ",V),"stale"===t&&e.createElement("p",{className:"text-xs text-yellow-700"},"Your version: ",V," | Latest version: ",o),"error"===t&&e.createElement("p",{className:"text-xs text-red-700"},"Please check your internet connection.")))),"stale"===t&&s&&e.createElement("a",{href:s,target:"_blank",rel:"noopener noreferrer",className:"mt-3 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800"},e.createElement(g,{className:"w-5 h-5"}),"Download Update from GitHub"))};const H=({title:t,code:n,instructions:o})=>{const[a,s]=e.useState("Copy");return e.createElement("div",{className:"space-y-3"},e.createElement("div",{className:"flex justify-between items-center"},e.createElement("h4",{className:"font-semibold text-md text-slate-700"},t),e.createElement("button",{onClick:()=>{navigator.clipboard.writeText(n).then((()=>{s("Copied!"),setTimeout((()=>s("Copy")),2e3)}))},className:"inline-flex items-center gap-2 px-3 py-1 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all duration-150 ease-in-out"},e.createElement(_,{className:"w-4 h-4"}),a)),e.createElement("p",{className:"text-sm text-slate-600",dangerouslySetInnerHTML:{__html:o}}),e.createElement("pre",{className:"bg-slate-800 text-white p-4 rounded-md text-sm overflow-x-auto max-h-60"},e.createElement("code",null,n)))},W=()=>{const[t,n]=e.useState(!1);return e.createElement("div",{className:"p-6 bg-white rounded-lg shadow-lg space-y-6"},e.createElement("h3",{className:"text-lg font-semibold text-slate-800 border-b pb-3"},"Advanced Deployment"),e.createElement("div",{className:"bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4",role:"alert"},e.createElement("p",{className:"font-bold"},"Deploy Anywhere"),e.createElement("p",{className:"mt-1"},"Click the button below to get the code for a standalone version of this application. You can then upload these files directly to any static web host (like Hostinger's shared hosting) using FTP, without needing Node.js or a VPS.")),e.createElement("div",{className:"flex justify-center items-center py-4"},e.createElement("button",{onClick:()=>n(!t),className:"inline-flex items-center justify-center gap-3 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all"},e.createElement(g,{className:"w-6 h-6"}),t?"Hide Static Code":"Show Static Code")),t&&e.createElement("div",{className:"space-y-8 border-t pt-6"},e.createElement("div",null,e.createElement("h4",{className:"text-lg font-bold text-slate-800 mb-2"},"Deployment Instructions (FTP)"),e.createElement("ol",{className:"list-decimal list-inside space-y-2 text-slate-700 text-sm"},e.createElement("li",null,"Open your FTP client (like FileZilla) and connect to your web host."),e.createElement("li",null,"Navigate to the directory where your website should be, usually ",e.createElement("code",null,"public_html")," or ",e.createElement("code",null,"www"),"."),e.createElement("li",null,"Create a new file named ",e.createElement("strong",null,"index.html"),". Copy the code from the first box below and paste it into this new file. Save it."),e.createElement("li",null,"Create another new file named ",e.createElement("strong",null,"bundle.js"),". Copy the code from the second box and paste it into this file. Save it."),e.createElement("li",null,"Create one more file named ",e.createElement("strong",null,".htaccess")," (the dot at the beginning is important). Copy the code from the third box and paste it in. Save it."),e.createElement("li",null,"That's it! Your QR Attendance application should now be live at your domain."))),e.createElement(H,{title:"1. index.html",code:HTML_CODE,instructions:"Create a file named <code>index.html</code> and paste this content."}),e.createElement(H,{title:"2. bundle.js",code:JS_BUNDLE_CODE,instructions:"Create a file named <code>bundle.js</code> in the same directory and paste this content."}),e.createElement(H,{title:"3. .htaccess",code:"<IfModule mod_rewrite.c>\\nRewriteEngine On\\nRewriteBase /\\nRewriteRule ^index\\\\.html$ - [L]\\nRewriteCond %{REQUEST_FILENAME} !-f\\nRewriteCond %{REQUEST_FILENAME} !-d\\nRewriteCond %{REQUEST_FILENAME} !-l\\nRewriteRule . /index.html [L]\\n</IfModule>",instructions:"Create a file named <code>.htaccess</code> in the same directory. This helps with security and proper routing."})))};const Y=({onSaveKey:t,onLogout:n,secretKey:o,initialSetup:a=!1,currentUser:s})=>{const[i,l]=e.useState(o||""),[d,p]=e.useState(!1),[u,m]=e.useState([]),[g,f]=e.useState(""),[b,v]=e.useState(""),[y,k]=e.useState(!1),[C,E]=e.useState(null),[j,x]=e.useState(null);const R=()=>{k(!0);try{getUsers().then((e=>{m(e)}))}catch(e){E("Failed to load users.")}finally{k(!1)}};e.useEffect((()=>{s.role==="superuser"&&R()}),[s.role]);const I=async t=>{t.preventDefault(),E(null),x(null),g&&v?await async function(t){try{await(e={email:g,password:b,role:"user"},(n=()=>{try{const e=localStorage.getItem("app_users");return e?JSON.parse(e):[]}catch{return[]}})().some((e=>e.email===t.email))||t.email==="ponsri.big.gan.nav@gmail.com"?Promise.reject(new Error("User with this email already exists.")):(n().push(e),localStorage.setItem("app_users",JSON.stringify(n)),Promise.resolve())),x({type:"success",text:"User ".concat(g," added successfully.")}),f(""),v(""),await R()}catch(e){const t=e instanceof Error?e.message:"Failed to add user.";E(t)}}({email:g,password:b,role:"user"}):E("Email and password are required."),setTimeout((()=>x(null)),4e3)},A=async t=>{window.confirm("Are you sure you want to delete user ".concat(t,"?"))&&(x(null),await async function(e){let t=()=>{try{const e=localStorage.getItem("app_users");return e?JSON.parse(e):[]}catch{return[]}}();t=t.filter((t=>t.email!==e)),localStorage.setItem("app_users",JSON.stringify(t))}(t),x({type:"success",text:"User ".concat(t," has been deleted.")}),await R(),setTimeout((()=>x(null)),4e3))},P=()=>{i.trim()&&(p(!0),setTimeout((()=>{t(i.trim()),p(!1)}),500))},L="\\u003c?php\\n/*\\nPlugin Name: Custom Data Sync for QR Attendance App\\nDescription: Provides a secure REST API endpoint to sync student, teacher, and class data for the QR attendance app.\\nVersion: 2.2\\nAuthor: QR App Support\\n*/\\n\\n// Prevent direct access\\nif (!defined('ABSPATH')) {\\n    exit;\\n}\\n\\n// IMPORTANT: Allow the 'X-Sync-Key' header for CORS requests.\\nadd_filter( 'rest_allowed_cors_headers', function( $allowed_headers ) {\\n    $allowed_headers[] = 'x-sync-key';\\n    return $allowed_headers;\\n} );\\n\\n// Register the REST API routes\\nadd_action('rest_api_init', function () {\\n    // Main data sync endpoint\\n    register_rest_route('custom-sync/v1', '/data', array(\\n        'methods' => 'GET',\\n        'callback' => 'sync_app_data',\\n        'permission_callback' => 'sync_permission_check',\\n    ));\\n    // Attendance submission endpoint\\n    register_rest_route('custom-sync/v1', '/attendance', array(\\n        'methods' => 'POST',\\n        'callback' => 'receive_attendance_data',\\n        'permission_callback' => 'sync_permission_check',\\n    ));\\n\\n    // Class management endpoints\\n    register_rest_route('custom-sync/v1', '/classes', array(\\n        'methods' => 'GET',\\n        'callback' => 'get_all_classes_data',\\n        'permission_callback' => 'sync_permission_check',\\n    ));\\n    register_rest_route('custom-sync/v1', '/classes', array(\\n        'methods' => 'POST',\\n        'callback' => 'add_new_class_data',\\n        'permission_callback' => 'sync_permission_check',\\n    ));\\n    register_rest_route('custom-sync/v1', '/classes/(?P<id>\\\\d+)', array(\\n        'methods' => 'DELETE',\\n        'callback' => 'delete_class_data',\\n        'permission_callback' => 'sync_permission_check',\\n    ));\\n});\\n\\n// Permission check for the API key\\nif (!function_exists('sync_permission_check')) {\\n    function sync_permission_check($request) {\\n        $secret_key = $request->get_header('X-Sync-Key');\\n        $stored_key = get_option('qr_app_secret_key', ''); \\n        if (empty($stored_key) || empty($secret_key) || !hash_equals($stored_key, $secret_key)) {\\n            return new WP_Error('rest_forbidden', 'Invalid or missing secret key.', array('status' => 401));\\n        }\\n        return true;\\n    }\\n}\\n\\n// Helper function to get user profile photo\\nif (!function_exists('get_custom_user_photo_url')) {\\n    function get_custom_user_photo_url($user_id) {\\n        $avatar_meta = get_user_meta($user_id, 'smgt_user_avatar', true);\\n        if (!empty($avatar_meta)) {\\n            if (is_numeric($avatar_meta)) {\\n                $image_url = wp_get_attachment_image_url($avatar_meta, 'full');\\n                return $image_url ?: get_avatar_url($user_id);\\n            }\\n            if (filter_var($avatar_meta, FILTER_VALIDATE_URL)) {\\n                return $avatar_meta;\\n            }\\n        }\\n        return get_avatar_url($user_id);\\n    }\\n}\\n\\n// Central function to fetch class data\\nif (!function_exists('fetch_class_data_from_db')) {\\n    function fetch_class_data_from_db() {\\n        global $wpdb;\\n        $class_table = $wpdb->prefix . 'smgt_class';\\n        $usermeta_table = $wpdb->prefix . 'usermeta';\\n\\n        if ($wpdb->get_var(\\"SHOW TABLES LIKE '\$class_table'\\") != \$class_table) {\\n            return []; // Return empty if table doesn't exist\\n        }\\n\\n        $classes_results = $wpdb->get_results(\\"SELECT * FROM \$class_table\\");\\n        $classes_data = array();\\n\\n        foreach($classes_results as $class) {\\n            $student_count = $wpdb->get_var(\$wpdb->prepare(\\n                \\"SELECT COUNT(*) FROM \$usermeta_table WHERE meta_key = 'class_name' AND meta_value = %s\\", \$class->class_name\\n            ));\\n\\n            $classes_data[] = array(\\n                'id' => (string)\$class->class_id,\\n                'class_name' => \$class->class_name,\\n                'class_numeric' => \$class->class_numeric,\\n                'class_section' => maybe_unserialize(\$class->section_name),\\n                'class_capacity' => \$class->class_capacity,\\n                'student_count' => (int)\$student_count,\\n            );\\n        }\\n        return \$classes_data;\\n    }\\n}\\n\\n// Callback for GET /classes\\nif (!function_exists('get_all_classes_data')) {\\n    function get_all_classes_data(\$request) {\\n        return new WP_REST_Response(fetch_class_data_from_db(), 200);\\n    }\\n}\\n\\n// Callback function for main data sync GET /data\\nif (!function_exists('sync_app_data')) {\\n    function sync_app_data(\$request) {\\n        \$response_data = array(\\n            'students' => array(),\\n            'teachers' => array(),\\n            'classes'  => array(),\\n        );\\n\\n        // Fetch Students\\n        \$student_users = get_users(array('role' => 'student'));\\n        foreach (\$student_users as \$user) {\\n            \$response_data['students'][] = array(\\n                'studentId'     => (string)\$user->ID,\\n                'studentName'   => \$user->display_name,\\n                'class'         => get_user_meta(\$user->ID, 'class_name', true),\\n                'section'       => get_user_meta(\$user->ID, 'class_section', true),\\n                'rollNumber'    => get_user_meta(\$user->ID, 'roll_id', true),\\n                'contactNumber' => get_user_meta(\$user->ID, 'mobile', true) ?: get_user_meta(\$user->ID, 'phone', true),\\n                'profilePhotoUrl' => get_custom_user_photo_url(\$user->ID),\\n            );\\n        }\\n\\n        // Fetch Teachers\\n        \$teacher_users = get_users(array('role' => 'teacher'));\\n        foreach (\$teacher_users as \$user) {\\n            \$response_data['teachers'][] = array(\\n                'id'    => (string)\$user->ID,\\n                'name'  => \$user->display_name,\\n                'role'  => 'Teacher',\\n                'email' => \$user->user_email,\\n                'phone' => get_user_meta(\$user->ID, 'mobile', true) ?: get_user_meta(\$user->ID, 'phone', true),\\n                'profilePhotoUrl' => get_custom_user_photo_url(\$user->ID),\\n            );\\n        }\\n\\n        // Fetch Classes\\n        \$response_data['classes']  = fetch_class_data_from_db();\\n\\n        return new WP_REST_Response(\$response_data, 200);\\n    }\\n}\\n\\n// Callback function for POST /attendance\\nif (!function_exists('receive_attendance_data')) {\\n    function receive_attendance_data(\$request) {\\n        global \$wpdb;\\n        \$params = \$request->get_json_params();\\n        \$attendance_table = \$wpdb->prefix . 'smgt_attendence';\\n\\n        if (isset(\$params['students']) && is_array(\$params['students'])) {\\n            foreach (\$params['students'] as \$student_record) {\\n                 \$wpdb->insert(\$attendance_table, array(\\n                    'user_id' => \$student_record['id'],\\n                    'attendence_date' => (new DateTime(\$student_record['timestamp']))->format('Y-m-d'),\\n                    'status' => 'Present',\\n                    'attendence_by' => 1, // Default to admin user\\n                    'role_name' => 'student'\\n                ));\\n            }\\n        }        \\n        if (isset(\$params['teachers']) && is_array(\$params['teachers'])) {\\n            foreach (\$params['teachers'] as \$teacher_record) {\\n                \$wpdb->insert(\$attendance_table, array(\\n                    'user_id' => \$teacher_record['teacherId'],\\n                    'attendence_date' => \$teacher_record['date'],\\n                    'status' => \$teacher_record['status'],\\n                    'comment' => \$teacher_record['comment'],\\n                    'attendence_by' => 1, // Default to admin user\\n                    'role_name' => 'teacher'\\n                ));\\n            }\\n        }\\n\\n        return new WP_REST_Response(array('success' => true, 'message' => 'Attendance recorded.'), 200);\\n    }\\n}\\n\\n// Callback for POST /classes\\nif (!function_exists('add_new_class_data')) {\\n    function add_new_class_data(\$request) {\\n        global \$wpdb;\\n        \$params = \$request->get_json_params();\\n        \$class_table = \$wpdb->prefix . 'smgt_class';\\n\\n        \$data_to_insert = array(\\n            'class_name' => sanitize_text_field(\$params['class_name']),\\n            'class_numeric' => intval(\$params['class_numeric']),\\n            'section_name' => serialize(\$params['class_section']), // Serialize array for storage\\n            'class_capacity' => intval(\$params['class_capacity']),\\n        );\\n\\n        \$result = \$wpdb->insert(\$class_table, \$data_to_insert);\\n\\n        if (\$result === false) {\\n            return new WP_Error('db_error', 'Could not add class to the database.', array('status' => 500));\\n        }\\n\\n        return new WP_REST_Response(array('success' => true, 'message' => 'Class added successfully.'), 201);\\n    }\\n}\\n\\n// Callback for DELETE /classes/{id}\\nif (!function_exists('delete_class_data')) {\\n    function delete_class_data(\$request) {\\n        global \$wpdb;\\n        \$class_id = (int) \$request['id'];\\n        \$class_table = \$wpdb->prefix . 'smgt_class';\\n\\n        \$result = \$wpdb->delete(\$class_table, array('class_id' => \$class_id), array('%d'));\\n\\n        if (\$result === false) {\\n             return new WP_Error('db_error', 'Could not delete class from the database.', array('status' => 500));\\n        }\\n        if (\$result === 0) {\\n            return new WP_Error('not_found', 'Class with the specified ID was not found.', array('status' => 404));\\n        }\\n\\n        return new WP_REST_Response(array('success' => true, 'message' => 'Class deleted successfully.'), 200);\\n    }\\n}\\n\\n// Add a settings page for the API key\\nadd_action('admin_menu', function() {\\n    add_options_page('QR App Sync Settings', 'QR App Sync', 'manage_options', 'qr-app-sync', 'qr_app_settings_page_html');\\n});\\n\\nif (!function_exists('qr_app_settings_page_html')) {\\n    function qr_app_settings_page_html() {\\n        if (!current_user_can('manage_options')) {\\n            return;\\n        }\\n        if (isset(\$_GET['settings-updated'])) {\\n            add_settings_error('qr_app_messages', 'qr_app_message', __('Settings Saved', 'qr-app-sync'), 'updated');\\n        }\\n        settings_errors('qr_app_messages');\\n        ?>\\n        <div class=\\"wrap\\">\\n            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>\\n            <p>Use this page to set the secret API key required for the QR Attendance App to sync data.</p>\\n            <form action=\\"options.php\\" method=\\"post\\">\\n                <?php\\n                settings_fields('qr-app-sync');\\n                do_settings_sections('qr-app-sync');\\n                submit_button('Save Settings');\\n                ?>\\n            </form>\\n        </div>\\n        <?php\\n    }\\n}\\n\\nadd_action('admin_init', function() {\\n    register_setting('qr-app-sync', 'qr_app_secret_key');\\n    add_settings_section('qr_app_section_developers', __('API Settings', 'qr-app-sync'), null, 'qr-app-sync');\\n    add_settings_field('qr_app_secret_key', __('Secret Key', 'qr-app-sync'), 'qr_app_secret_key_callback', 'qr-app-sync', 'qr_app_section_developers');\\n});\\n\\nif (!function_exists('qr_app_secret_key_callback')) {\\n    function qr_app_secret_key_callback() {\\n        \$option = get_option('qr_app_secret_key');\\n        echo '<input type=\\"text\\" id=\\"qr_app_secret_key\\" name=\\"qr_app_secret_key\\" value=\\"' . esc_attr(\$option) . '\\" size=\\"50\\" />';\\n        echo '<p class=\\"description\\">Enter a strong, unique secret key for the app to use. This must match the key entered in the app.</p>';\\n    }\\n}\\n?>",D=({records:t})=>e.createElement("div",{className:"w-full bg-white rounded-lg shadow-lg overflow-hidden"},0===t.length?e.createElement("div",{className:"text-center text-slate-500 py-16 px-6"},e.createElement("p",{className:"font-semibold"},"No teachers marked present yet."),e.createElement("p",{className:"text-sm mt-1"},"Scan a teacher's QR code to mark them present.")):e.createElement("div",{className:"max-h-[28rem] overflow-y-auto"},e.createElement("table",{className:"min-w-full"},e.createElement("thead",{className:"bg-slate-50 sticky top-0"},e.createElement("tr",null,e.createElement("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},"Teacher"),e.createElement("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"},"Comment"))),e.createElement("tbody",{className:"divide-y divide-slate-200"},t.map((t=>e.createElement("tr",{key:t.teacherId,className:"hover:bg-slate-50 transition-colors"},e.createElement("td",{className:"px-6 py-4 whitespace-nowrap"},e.createElement("div",{className:"flex items-center space-x-3"},e.createElement("div",{className:"flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"},e.createElement(m,{className:"w-6 h-6 text-green-600"})),e.createElement("div",null,e.createElement("div",{className:"text-sm font-medium text-slate-900"},t.teacherName),e.createElement("div",{className:"text-xs text-slate-500"},"ID: ",t.teacherId)))),e.createElement("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-600"},t.comment)))))))});const Ne=()=>{const[t,o]=e.useState((()=>null)),[a,l]=e.useState((()=>localStorage.getItem("API_SECRET_KEY"))),[d,p]=e.useState(!0),[u,m]=e.useState("qr_attendance"),[h,g]=e.useState(null),[f,b]=e.useState([]),[v,y]=e.useState([]),[k,_]=e.useState([]),[C,E]=e.useState((new Map)),[j,x]=e.useState((new Map)),[R,I]=e.useState(!1),[A,P]=e.useState(null),[L,D]=e.useState(null),[N,O]=e.useState([]),[F,M]=e.useState((new Map)),[q,U]=e.useState([]);e.useEffect((()=>{const e=localStorage.getItem("CURRENT_USER");e&&o(JSON.parse(e))}),[]),e.useEffect((()=>{t&&a?q(a):p(!1)}),[t]),e.useEffect((()=>{E(new Map(f.map((e=>[e.studentId,e]))))}),[f]),e.useEffect((()=>{x(new Map(v.map((e=>[e.id,e]))))}),[v]);const B=(e,n)=>{const B=async e=>{if(!e)return void g("Cannot sync: Secret API key is not set.");g(null);try{const{students:t,teachers:n,classes:o}=await s(e);b(t),y(n),_(o)}catch(e){const t=e instanceof Error?e.message:"An unknown error occurred.";g("Failed to sync with the school server: ".concat(t,". Please check your Secret Key and network connection."))}finally{d&&p(!1)}};return e.createElement("div",{className:"min-h-screen bg-slate-100 font-sans"},P&&e.createElement(V,{person:P.person,scanTime:P.time,onClose:()=>D(null)}),e.createElement(G,{currentUser:t,onLogout:()=>{localStorage.removeItem("CURRENT_USER"),localStorage.removeItem("API_SECRET_KEY"),o(null),l(null),b([]),y([]),_([]),E(new Map),x(new Map),O([]),U([]),M(new Map),g(null)},onNavigate:e=>m(e)}),e.createElement("main",{className:"max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"},h&&e.createElement("div",{className:"bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow",role:"alert"},e.createElement("p",{className:"font-bold"},"Data Sync Error"),e.createElement("p",null,h)),e.createElement("div",{className:"mb-8"},e.createElement("div",{className:"sm:hidden"},e.createElement("select",{id:"tabs",name:"tabs",className:"block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm",onChange:e=>m(e.target.value),value:u},e.createElement("option",{value:"qr_attendance"},"QR Attendance"),e.createElement("option",{value:"teacher_attendance"},"Teacher Attendance"),e.createElement("option",{value:"class_management"},"Class"),e.createElement("option",{value:"data_viewer"},"Manage Data & IDs"),e.createElement("option",{value:"settings"},"Settings"))),e.createElement("div",{className:"hidden sm:block"},e.createElement("div",{className:"border-b border-slate-200"},e.createElement("nav",{className:"-mb-px flex space-x-8","aria-label":"Tabs"},e.createElement("button",{onClick:()=>m("qr_attendance"),className:"".concat("qr_attendance"===u?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"," whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer")},e.createElement(d,{className:"w-5 h-5"}),"QR Attendance"),e.createElement("button",{onClick:()=>m("teacher_attendance"),className:"".concat("teacher_attendance"===u?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"," whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer")},e.createElement(b,{className:"w-5 h-5"}),"Teacher Attendance"),e.createElement("button",{onClick:()=>m("class_management"),className:"".concat("class_management"===u?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"," whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer")},e.createElement(R,{className:"w-5 h-5"}),"Class"),e.createElement("button",{onClick:()=>m("data_viewer"),className:"".concat("data_viewer"===u?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"," whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer")},e.createElement(v,{className:"w-5 h-5"}),"Manage Data & IDs"),e.createElement("button",{onClick:()=>m("settings"),className:"".concat("settings"===u?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"," whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer")},e.createElement(k,{className:"w-5 h-5"}),"Settings"))))),e.createElement("div",{className:"mt-8"},(()=>{switch(u){case"qr_attendance":return e.createElement(z,null);case"teacher_attendance":return e.createElement(O,{teachers:v,attendance:F,onAttendanceChange:M,onSubmit:async e=>{if(!a)return void alert("Cannot submit attendance: Secret API key is not set.");try{await c(e,a),alert("Teacher attendance submitted successfully!")}catch(e){const t=e instanceof Error?e.message:"An unknown error occurred.";alert("Submission failed: ".concat(t))}}});case"class_management":return e.createElement(H,{initialClasses:k,secretKey:a,onDataChange:()=>B()});case"data_viewer":return e.createElement(U,{students:f,teachers:v});case"settings":return e.createElement(Y,{onSaveKey:e=>{localStorage.setItem("API_SECRET_KEY",e),l(e),m("qr_attendance"),B(e)},onLogout:()=>{localStorage.removeItem("CURRENT_USER"),localStorage.removeItem("API_SECRET_KEY"),o(null),l(null),b([]),y([]),_([]),E(new Map),x(new Map),O([]),U([]),M(new Map),g(null)},secretKey:a,currentUser:t});default:return null}})()))}};t?d?e.createElement("div",{className:"min-h-screen bg-slate-100 flex flex-col justify-center items-center gap-4"},e.createElement(w,{className:"w-12 h-12 text-indigo-700"}),e.createElement("p",{className:"text-slate-600"},"Connecting to school server...")):a?B():e.createElement("div",{className:"min-h-screen bg-slate-100 font-sans"},e.createElement(G,{currentUser:t,onLogout:()=>{},onNavigate:()=>{}}),e.createElement("main",{className:"max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8"},e.createElement(Y,{onSaveKey:e=>{localStorage.setItem("API_SECRET_KEY",e),l(e),m("qr_attendance"),q(e)},initialSetup:!0,currentUser:t}))):e.createElement(W,{onLogin:async(e,t)=>{if("ponsri.big.gan.nav@gmail.com"===e&&"Pvp3736@257237"===t)return{email:e,role:"superuser"};const n=()=>{try{const e=localStorage.getItem("app_users");return e?JSON.parse(e):[]}catch{return[]}}().find((n=>n.email===e&&n.password===t));return n?{email:n.email,role:n.role}:null},onLoginSuccess:e=>{localStorage.setItem("CURRENT_USER",JSON.stringify(e)),o(e)}})}})())})();
`;

const PLUGIN_CODE = `<?php
/*
Plugin Name: Custom Data Sync for QR Attendance App
Description: Provides a secure REST API endpoint to sync student, teacher, and class data for the QR attendance app.
Version: 2.2
Author: QR App Support
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// IMPORTANT: Allow the 'X-Sync-Key' header for CORS requests.
add_filter( 'rest_allowed_cors_headers', function( $allowed_headers ) {
    $allowed_headers[] = 'x-sync-key';
    return $allowed_headers;
} );

// Register the REST API routes
add_action('rest_api_init', function () {
    // Main data sync endpoint
    register_rest_route('custom-sync/v1', '/data', array(
        'methods' => 'GET',
        'callback' => 'sync_app_data',
        'permission_callback' => 'sync_permission_check',
    ));
    // Attendance submission endpoint
    register_rest_route('custom-sync/v1', '/attendance', array(
        'methods' => 'POST',
        'callback' => 'receive_attendance_data',
        'permission_callback' => 'sync_permission_check',
    ));

    // Class management endpoints
    register_rest_route('custom-sync/v1', '/classes', array(
        'methods' => 'GET',
        'callback' => 'get_all_classes_data',
        'permission_callback' => 'sync_permission_check',
    ));
    register_rest_route('custom-sync/v1', '/classes', array(
        'methods' => 'POST',
        'callback' => 'add_new_class_data',
        'permission_callback' => 'sync_permission_check',
    ));
    register_rest_route('custom-sync/v1', '/classes/(?P<id>\\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_class_data',
        'permission_callback' => 'sync_permission_check',
    ));
});

// Permission check for the API key
if (!function_exists('sync_permission_check')) {
    function sync_permission_check($request) {
        $secret_key = $request->get_header('X-Sync-Key');
        $stored_key = get_option('qr_app_secret_key', ''); 
        if (empty($stored_key) || empty($secret_key) || !hash_equals($stored_key, $secret_key)) {
            return new WP_Error('rest_forbidden', 'Invalid or missing secret key.', array('status' => 401));
        }
        return true;
    }
}

// Helper function to get user profile photo
if (!function_exists('get_custom_user_photo_url')) {
    function get_custom_user_photo_url($user_id) {
        $avatar_meta = get_user_meta($user_id, 'smgt_user_avatar', true);
        if (!empty($avatar_meta)) {
            if (is_numeric($avatar_meta)) {
                $image_url = wp_get_attachment_image_url($avatar_meta, 'full');
                return $image_url ?: get_avatar_url($user_id);
            }
            if (filter_var($avatar_meta, FILTER_VALIDATE_URL)) {
                return $avatar_meta;
            }
        }
        return get_avatar_url($user_id);
    }
}

// Central function to fetch class data
if (!function_exists('fetch_class_data_from_db')) {
    function fetch_class_data_from_db() {
        global $wpdb;
        $class_table = $wpdb->prefix . 'smgt_class';
        $usermeta_table = $wpdb->prefix . 'usermeta';

        if ($wpdb->get_var("SHOW TABLES LIKE '$class_table'") != $class_table) {
            return []; // Return empty if table doesn't exist
        }

        $classes_results = $wpdb->get_results("SELECT * FROM $class_table");
        $classes_data = array();

        foreach($classes_results as $class) {
            $student_count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM $usermeta_table WHERE meta_key = 'class_name' AND meta_value = %s", $class->class_name
            ));

            $classes_data[] = array(
                'id' => (string)$class->class_id,
                'class_name' => $class->class_name,
                'class_numeric' => $class->class_numeric,
                'class_section' => maybe_unserialize($class->section_name),
                'class_capacity' => $class->class_capacity,
                'student_count' => (int)$student_count,
            );
        }
        return $classes_data;
    }
}

// Callback for GET /classes
if (!function_exists('get_all_classes_data')) {
    function get_all_classes_data($request) {
        return new WP_REST_Response(fetch_class_data_from_db(), 200);
    }
}

// Callback function for main data sync GET /data
if (!function_exists('sync_app_data')) {
    function sync_app_data($request) {
        $response_data = array(
            'students' => array(),
            'teachers' => array(),
            'classes'  => array(),
        );

        // Fetch Students
        $student_users = get_users(array('role' => 'student'));
        foreach ($student_users as $user) {
            $response_data['students'][] = array(
                'studentId'     => (string)$user->ID,
                'studentName'   => $user->display_name,
                'class'         => get_user_meta($user->ID, 'class_name', true),
                'section'       => get_user_meta($user->ID, 'class_section', true),
                'rollNumber'    => get_user_meta($user->ID, 'roll_id', true),
                'contactNumber' => get_user_meta($user->ID, 'mobile', true) ?: get_user_meta($user->ID, 'phone', true),
                'profilePhotoUrl' => get_custom_user_photo_url($user->ID),
            );
        }

        // Fetch Teachers
        $teacher_users = get_users(array('role' => 'teacher'));
        foreach ($teacher_users as $user) {
            $response_data['teachers'][] = array(
                'id'    => (string)$user->ID,
                'name'  => $user->display_name,
                'role'  => 'Teacher',
                'email' => $user->user_email,
                'phone' => get_user_meta($user->ID, 'mobile', true) ?: get_user_meta($user->ID, 'phone', true),
                'profilePhotoUrl' => get_custom_user_photo_url($user->ID),
            );
        }

        // Fetch Classes
        $response_data['classes']  = fetch_class_data_from_db();

        return new WP_REST_Response($response_data, 200);
    }
}

// Callback function for POST /attendance
if (!function_exists('receive_attendance_data')) {
    function receive_attendance_data($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $attendance_table = $wpdb->prefix . 'smgt_attendence';

        if (isset($params['students']) && is_array($params['students'])) {
            foreach ($params['students'] as $student_record) {
                 $wpdb->insert($attendance_table, array(
                    'user_id' => $student_record['id'],
                    'attendence_date' => (new DateTime($student_record['timestamp']))->format('Y-m-d'),
                    'status' => 'Present',
                    'attendence_by' => 1, // Default to admin user
                    'role_name' => 'student'
                ));
            }
        }        
        if (isset($params['teachers']) && is_array($params['teachers'])) {
            foreach ($params['teachers'] as $teacher_record) {
                $wpdb->insert($attendance_table, array(
                    'user_id' => $teacher_record['teacherId'],
                    'attendence_date' => $teacher_record['date'],
                    'status' => $teacher_record['status'],
                    'comment' => $teacher_record['comment'],
                    'attendence_by' => 1, // Default to admin user
                    'role_name' => 'teacher'
                ));
            }
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Attendance recorded.'), 200);
    }
}

// Callback for POST /classes
if (!function_exists('add_new_class_data')) {
    function add_new_class_data($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $class_table = $wpdb->prefix . 'smgt_class';

        $data_to_insert = array(
            'class_name' => sanitize_text_field($params['class_name']),
            'class_numeric' => intval($params['class_numeric']),
            'section_name' => serialize($params['class_section']), // Serialize array for storage
            'class_capacity' => intval($params['class_capacity']),
        );

        $result = $wpdb->insert($class_table, $data_to_insert);

        if ($result === false) {
            return new WP_Error('db_error', 'Could not add class to the database.', array('status' => 500));
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Class added successfully.'), 201);
    }
}

// Callback for DELETE /classes/{id}
if (!function_exists('delete_class_data')) {
    function delete_class_data($request) {
        global $wpdb;
        $class_id = (int) $request['id'];
        $class_table = $wpdb->prefix . 'smgt_class';

        $result = $wpdb->delete($class_table, array('class_id' => $class_id), array('%d'));

        if ($result === false) {
             return new WP_Error('db_error', 'Could not delete class from the database.', array('status' => 500));
        }
        if ($result === 0) {
            return new WP_Error('not_found', 'Class with the specified ID was not found.', array('status' => 404));
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Class deleted successfully.'), 200);
    }
}

// Add a settings page for the API key
add_action('admin_menu', function() {
    add_options_page('QR App Sync Settings', 'QR App Sync', 'manage_options', 'qr-app-sync', 'qr_app_settings_page_html');
});

if (!function_exists('qr_app_settings_page_html')) {
    function qr_app_settings_page_html() {
        if (!current_user_can('manage_options')) {
            return;
        }
        if (isset($_GET['settings-updated'])) {
            add_settings_error('qr_app_messages', 'qr_app_message', __('Settings Saved', 'qr-app-sync'), 'updated');
        }
        settings_errors('qr_app_messages');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <p>Use this page to set the secret API key required for the QR Attendance App to sync data.</p>
            <form action="options.php" method="post">
                <?php
                settings_fields('qr-app-sync');
                do_settings_sections('qr-app-sync');
                submit_button('Save Settings');
                ?>
            </form>
        </div>
        <?php
    }
}

add_action('admin_init', function() {
    register_setting('qr-app-sync', 'qr_app_secret_key');
    add_settings_section('qr_app_section_developers', __('API Settings', 'qr-app-sync'), null, 'qr-app-sync');
    add_settings_field('qr_app_secret_key', __('Secret Key', 'qr-app-sync'), 'qr_app_secret_key_callback', 'qr-app-sync', 'qr_app_section_developers');
});

if (!function_exists('qr_app_secret_key_callback')) {
    function qr_app_secret_key_callback() {
        $option = get_option('qr_app_secret_key');
        echo '<input type="text" id="qr_app_secret_key" name="qr_app_secret_key" value="' . esc_attr($option) . '" size="50" />';
        echo '<p class="description">Enter a strong, unique secret key for the app to use. This must match the key entered in the app.</p>';
    }
}
?>`;

interface SettingsProps {
    onSaveKey: (key: string) => void;
    onLogout?: () => void;
    secretKey?: string | null;
    initialSetup?: boolean;
    currentUser: Omit<User, 'password'>;
}

const WordPressPluginCode = ({ name, code, version }: { name: string, code: string, version: string }) => {
    const [copyText, setCopyText] = useState('Copy Code');

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Code'), 2000);
        });
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/php' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom-data-sync.php';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            <div className="border-b pb-3 flex flex-col sm:flex-row justify-between items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <ClipboardIcon className="w-5 h-5"/> {name} (v{version})
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50"
                    >
                        <ClipboardIcon className="w-4 h-4"/>
                        {copyText}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800"
                    >
                        <DownloadIcon className="w-4 h-4"/>
                        Download File
                    </button>
                </div>
            </div>
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4" role="alert">
                <p className="font-bold">How to Install & Set Your Secret Key</p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li><strong>Create Plugin File:</strong> Download the plugin file or copy the PHP code below and save it in a new file named <code>custom-data-sync.php</code>.</li>
                    <li><strong>Upload Plugin:</strong> In your WordPress dashboard, go to <strong>Plugins → Add New → Upload Plugin</strong>, and upload the file.</li>
                    <li><strong>Activate:</strong> Activate the "Custom Data Sync for QR Attendance App" plugin from your plugins list.</li>
                    <li><strong>Go to Settings:</strong> Navigate to <strong>Settings → QR App Sync</strong> in the left-hand menu.</li>
                    <li><strong>Save Your Key:</strong> Enter the exact same Secret API Key that you use in this application into the "Secret Key" field and click "Save Settings".</li>
                </ol>
            </div>
            <pre className="bg-slate-800 text-white p-4 rounded-md text-sm overflow-x-auto max-h-96">
                <code>
                    {code}
                </code>
            </pre>
        </div>
    );
};

const UpdateChecker = () => {
    const [status, setStatus] = useState<'checking' | 'latest' | 'stale' | 'error'>('checking');
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [releaseUrl, setReleaseUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchLatestVersion = async () => {
            try {
                const response = await fetch('https://api.github.com/repos/Preet3627/Attendance-Management-System/releases/latest');
                if (!response.ok) throw new Error('GitHub API request failed');
                const data = await response.json();
                const latest = data.tag_name?.replace('v', '');
                if (!latest) throw new Error('Could not parse version from GitHub response');
                setLatestVersion(latest);
                setReleaseUrl(data.html_url);
                setStatus(latest === CURRENT_APP_VERSION ? 'latest' : 'stale');
            } catch (err) {
                console.error("Update check failed:", err);
                setStatus('error');
            }
        };
        fetchLatestVersion();
    }, []);

    return (
        <div>
            <h4 className="font-semibold text-md text-slate-700">Update Status</h4>
            <div className={`mt-2 p-4 rounded-md ${
                status === 'checking' ? 'bg-slate-100' : 
                status === 'latest' ? 'bg-green-100' :
                status === 'stale' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
                <div className="flex items-center gap-3">
                    {status === 'checking' && <SpinnerIcon className="w-5 h-5 text-slate-500" />}
                    {status === 'latest' && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
                    {(status === 'stale' || status === 'error') && <ExclamationCircleIcon className="w-5 h-5 text-yellow-600" />}
                    
                    <div>
                        <p className={`text-sm font-medium ${
                            status === 'latest' ? 'text-green-800' :
                            status === 'stale' ? 'text-yellow-800' :
                            status === 'error' ? 'text-red-800' : 'text-slate-700'
                        }`}>
                            {status === 'checking' && 'Checking for updates...'}
                            {status === 'latest' && 'You are up to date!'}
                            {status === 'stale' && 'Update Available'}
                            {status === 'error' && 'Could not check for updates'}
                        </p>
                        {status === 'latest' && <p className="text-xs text-green-700">App Version: {CURRENT_APP_VERSION}</p>}
                        {status === 'stale' && <p className="text-xs text-yellow-700">Your version: {CURRENT_APP_VERSION} | Latest version: {latestVersion}</p>}
                        {status === 'error' && <p className="text-xs text-red-700">Please check your internet connection.</p>}
                    </div>
                </div>
            </div>
            {status === 'stale' && releaseUrl && (
                <a 
                    href={releaseUrl}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800"
                >
                    <DownloadIcon className="w-5 h-5" />
                    Download Update from GitHub
                </a>
            )}
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ onSaveKey, onLogout, secretKey: initialKey, initialSetup = false, currentUser }) => {
    const [secretKey, setSecretKey] = useState(initialKey || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // User management state
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);
    const [userMessage, setUserMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);


     useEffect(() => {
        if (currentUser.role === 'superuser') {
            fetchUsers();
        }
    }, [currentUser.role]);

    const fetchUsers = async () => {
        setIsUsersLoading(true);
        try {
            const fetchedUsers = await getUsers();
            setUsers(fetchedUsers);
        } catch (error) {
            setUserError('Failed to load users.');
        } finally {
            setIsUsersLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserError(null);
        setUserMessage(null);
        if (!newUserEmail || !newUserPassword) {
            setUserError('Email and password are required.');
            return;
        }
        try {
            await addUser({ email: newUserEmail, password: newUserPassword, role: 'user' });
            setUserMessage({ type: 'success', text: `User ${newUserEmail} added successfully.` });
            setNewUserEmail('');
            setNewUserPassword('');
            await fetchUsers();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to add user.';
            setUserError(msg);
        }
        setTimeout(() => setUserMessage(null), 4000);
    };

    const handleDeleteUser = async (email: string) => {
        if (window.confirm(`Are you sure you want to delete user ${email}?`)) {
            setUserMessage(null);
            try {
                await deleteUser(email);
                setUserMessage({ type: 'success', text: `User ${email} has been deleted.` });
                await fetchUsers();
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Failed to delete user.';
                setUserMessage({ type: 'error', text: msg });
            }
            setTimeout(() => setUserMessage(null), 4000);
        }
    };


    const handleSave = () => {
        if (secretKey.trim()) {
            setIsSaving(true);
            setTimeout(() => {
                onSaveKey(secretKey.trim());
                setIsSaving(false);
            }, 500);
        }
    };

    const CodeBlock = ({ title, code, instructions }: { title: string, code: string, instructions: string }) => {
        const [copyText, setCopyText] = useState('Copy Code');
        const handleCopy = () => {
            navigator.clipboard.writeText(code).then(() => {
                setCopyText('Copied!');
                setTimeout(() => setCopyText('Copy'), 2000);
            });
        };
        return (
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-md text-slate-700">{title}</h4>
                    <button 
                        onClick={handleCopy} 
                        className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all duration-150 ease-in-out"
                    >
                        <ClipboardIcon className="w-4 h-4"/>
                        {copyText}
                    </button>
                </div>
                <p className="text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: instructions }}></p>
                <pre className="bg-slate-800 text-white p-4 rounded-md text-sm overflow-x-auto max-h-60">
                    <code>{code}</code>
                </pre>
            </div>
        );
    };

    const AdvancedDeployment = () => (
         <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">Advanced Deployment</h3>
                <div className="space-y-8">
                    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4" role="alert">
                         <p className="font-bold">Deploy Anywhere</p>
                         <p className="mt-1">
                            The code below is for a standalone version of this application. You can upload these files directly to any static web host (like Hostinger's shared hosting) using FTP, without needing Node.js or a VPS.
                         </p>
                    </div>

                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-2">Deployment Instructions (FTP)</h4>
                        <ol className="list-decimal list-inside space-y-2 text-slate-700 text-sm">
                            <li>Open your FTP client (like FileZilla) and connect to your web host.</li>
                            <li>Navigate to the directory where your website should be, usually <code>public_html</code> or <code>www</code>.</li>
                            <li>Create a new file named <strong>index.html</strong>. Copy the code from the first box below and paste it into this new file. Save it.</li>
                            <li>Create another new file named <strong>bundle.js</strong>. Copy the code from the second box and paste it into this file. Save it.</li>
                            <li>Create one more file named <strong>.htaccess</strong> (the dot at the beginning is important). Copy the code from the third box and paste it in. Save it.</li>
                            <li>That's it! Your QR Attendance application should now be live at your domain.</li>
                        </ol>
                    </div>

                    <CodeBlock 
                        title="1. index.html" 
                        code={HTML_CODE}
                        instructions="Create a file named <code>index.html</code> and paste this content."
                    />
                    <CodeBlock 
                        title="2. bundle.js" 
                        code={JS_BUNDLE_CODE}
                        instructions="Create a file named <code>bundle.js</code> in the same directory and paste this content."
                    />
                    <CodeBlock 
                        title="3. .htaccess" 
                        code={`<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteBase /\nRewriteRule ^index\\.html$ - [L]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteCond %{REQUEST_FILENAME} !-l\nRewriteRule . /index.html [L]\n</IfModule>`}
                        instructions="Create a file named <code>.htaccess</code> in the same directory. This helps with security and proper routing."
                    />
                </div>
        </div>
    );
    
    const nameMatch = PLUGIN_CODE.match(/Plugin Name:\\s*(.*)/);
    const versionMatch = PLUGIN_CODE.match(/Version:\\s*([0-9.]+)/);
    const pluginInfo = {
        name: nameMatch ? nameMatch[1].trim() : 'WordPress Plugin',
        code: PLUGIN_CODE,
        version: versionMatch ? versionMatch[1].trim() : 'N/A'
    };

    return (
        <div className="space-y-8">
            <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">{initialSetup ? 'Initial API Key Setup' : 'API Key Settings'}</h3>
                {initialSetup && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
                        <p className="font-bold">Welcome!</p>
                        <p>Please enter the Secret API Key from your WordPress plugin to connect this device to the server. You can find instructions for the plugin below.</p>
                    </div>
                )}
                <div className="space-y-2">
                    <label htmlFor="secret-key" className="block text-sm font-medium text-slate-700">Secret API Key</label>
                    <div className="flex gap-4">
                        <input
                            type="password"
                            id="secret-key"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            className="flex-grow shadow-sm focus:ring-indigo-600 focus:border-indigo-600 block w-full sm:text-sm border-slate-300 rounded-md"
                            placeholder="Enter your secret key"
                        />
                         <button
                            onClick={handleSave}
                            disabled={isSaving || !secretKey.trim()}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:bg-indigo-500 disabled:cursor-wait"
                        >
                            {isSaving ? <><SpinnerIcon className="w-5 h-5 mr-2" /> Saving...</> : 'Save Key'}
                        </button>
                    </div>
                </div>
                 {!initialSetup && onLogout && (
                     <div className="border-t pt-6">
                        <button
                            onClick={onLogout}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                           <LogoutIcon className="w-5 h-5 mr-2" /> Log Out
                        </button>
                     </div>
                )}
            </div>

            <WordPressPluginCode name={pluginInfo.name} code={pluginInfo.code} version={pluginInfo.version} />

            {currentUser.role === 'superuser' && (
                <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
                     <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 flex items-center gap-2"><UsersIcon className="w-5 h-5"/> User Management</h3>
                     {userMessage && (
                        <div className={`p-3 rounded-md text-sm ${userMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {userMessage.text}
                        </div>
                     )}
                     <form onSubmit={handleAddUser} className="space-y-4 sm:flex sm:items-end sm:gap-4">
                        <div className="flex-grow">
                             <label htmlFor="new-user-email" className="block text-sm font-medium text-slate-700">New User Email</label>
                             <input type="email" id="new-user-email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="mt-1 shadow-sm focus:ring-indigo-600 focus:border-indigo-600 block w-full sm:text-sm border-slate-300 rounded-md" />
                        </div>
                        <div className="flex-grow">
                             <label htmlFor="new-user-password" className="block text-sm font-medium text-slate-700">Password</label>
                             <input type="password" id="new-user-password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className="mt-1 shadow-sm focus:ring-indigo-600 focus:border-indigo-600 block w-full sm:text-sm border-slate-300 rounded-md" />
                        </div>
                         <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Add User</button>
                     </form>
                     {userError && <p className="text-sm text-red-600">{userError}</p>}
                    
                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-md text-slate-700 mb-2">Existing Users</h4>
                        {isUsersLoading ? <SpinnerIcon className="w-6 h-6 text-indigo-700" /> : (
                            <ul className="divide-y divide-slate-200">
                                {users.map(user => (
                                     <li key={user.email} className="py-3 flex justify-between items-center">
                                         <div>
                                            <p className="text-sm font-medium text-slate-900">{user.email}</p>
                                            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                                         </div>
                                         <button onClick={() => handleDeleteUser(user.email)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                                     </li>
                                ))}
                                {users.length === 0 && <p className="text-sm text-slate-500">No standard users found.</p>}
                            </ul>
                        )}
                    </div>
                </div>
            )}
            
             <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">Application Info &amp; Updates</h3>
                <UpdateChecker />
                <div className="border-t pt-6 flex justify-center items-center">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="inline-flex items-center justify-center gap-3 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all"
                    >
                        <CloudDownloadIcon className="w-6 h-6" />
                        {showAdvanced ? 'Hide Deployment Instructions' : 'Show Deployment Instructions'}
                    </button>
                </div>
             </div>

            {showAdvanced && <AdvancedDeployment />}
        </div>
    );
};

export default Settings;