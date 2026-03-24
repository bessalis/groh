import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

const MONTHS = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"]
const CURRENT = "mars"

export default function Calendar() {
  const [mine, setMine] = useState([])
  useEffect(() => {
    supabase.from("seeds").select("name").then(({data}) => {
      if (data) setMine(data.map(s => s.name.toLowerCase()))
    })
  }, [])
  return (
    <div style={{padding:"24px 16px 80px",maxWidth:"480px",margin:"0 auto"}}>
      <h1 style={{fontSize:"28px",fontFamily:"Georgia,serif",fontStyle:"italic",color:"#2E4228"}}>Sakalender</h1>
      <p style={{fontSize:"12px",color:"#7A9E6E",marginBottom:"20px"}}>ZON 4 - UPPSALA - 2026</p>
      {MONTHS.map(m => (
        <div key={m} style={{background: m===CURRENT ? "#F2F5F0":"#F7F5EF", border: m===CURRENT ? "1px solid #B8CEB0":"0.5px solid #C8C0A8", borderRadius:"12px", padding:"12px 14px", marginBottom:"8px"}}>
          <p style={{fontSize:"11px",fontWeight:500,color:m===CURRENT?"#4E6E44":"#7A9E6E",margin:"0 0 6px",letterSpacing:"0.08em"}}>{m.toUpperCase()}{m===CURRENT ? " - nu" : ""}</p>
        </div>
      ))}
    </div>
  )
}
