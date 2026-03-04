"use client";

import React, { useState, useEffect } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Activity,
  Brain,
  Zap,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Database,
  LineChart,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Custom Node — Premium AI Style
───────────────────────────────────────────────────────────── */
const CustomNode = ({ data }: any) => {
  const Icon = data.icon;

  const palette: Record<string, { border: string; iconBg: string; labelColor: string; dot: string; glow: string }> = {
    trigger:   { border: '#22c55e', iconBg: 'rgba(34,197,94,0.10)',   labelColor: '#16a34a', dot: '#22c55e', glow: 'rgba(34,197,94,0.3)' },
    logic:     { border: '#facc15', iconBg: 'rgba(250,204,21,0.10)',  labelColor: '#b45309', dot: '#facc15', glow: 'rgba(250,204,21,0.3)' },
    action:    { border: '#22c55e', iconBg: 'rgba(34,197,94,0.12)', labelColor: '#15803d', dot: '#22c55e', glow: 'rgba(34,197,94,0.3)' },
    condition: { border: '#fde68a', iconBg: 'rgba(253,230,138,0.12)', labelColor: '#92400e', dot: '#fde68a', glow: 'rgba(253,230,138,0.3)' },
  };
  const s = palette[data.type] ?? palette.action;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(12px)',
      border: `1.5px solid ${s.border}`,
      borderRadius: 16,
      width: 210,
      padding: '14px 16px',
      boxShadow: `0 8px 30px rgba(0,0,0,0.06), 0 0 15px ${s.glow}`,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
      cursor: 'grab',
      transition: 'all 0.3s ease',
    }}>
      <Handle type="target" position={Position.Left}  style={{ background: s.border, width: 8, height: 8, border: '2px solid #fff', left: -4 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ background: s.iconBg, borderRadius: 10, padding: 8, display: 'flex', flexShrink: 0 }}>
          <Icon size={18} style={{ color: s.border }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: s.labelColor, margin: 0, marginBottom: 2 }}>
            {data.type}
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0, lineHeight: 1.3 }}>
            {data.label}
          </p>
        </div>
      </div>

      {data.description && (
        <p style={{ marginTop: 8, fontSize: 11, color: '#666', lineHeight: 1.5, margin: '8px 0 0' }}>
          {data.description}
        </p>
      )}

      <span style={{
        position: 'absolute', top: 12, right: 14,
        width: 6, height: 6, borderRadius: '50%',
        background: s.dot, boxShadow: `0 0 8px ${s.dot}`,
        animation: 'wf-ping 2.5s ease-in-out infinite',
      }} />

      <Handle type="source" position={Position.Right} style={{ background: s.border, width: 8, height: 8, border: '2px solid #fff', right: -4 }} />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

/* ─── AI Business Graph Data ───────────────────────────── */
const GAP_X = 280;

const INITIAL_NODES: Node[] = [
  { id: '1', type: 'custom', data: { label: 'Multi-channel Pulse', icon: Database,     type: 'trigger',   description: 'Shopify, Stripe & Ads Sync'  }, position: { x: 0,         y: 160 } },
  { id: '2', type: 'custom', data: { label: 'AI Trend Analysis',   icon: Brain,        type: 'logic',     description: 'Predicting Growth Curves'    }, position: { x: GAP_X,     y: 160 } },
  { id: '3', type: 'custom', data: { label: 'Growth Trigger',      icon: Zap,          type: 'condition', description: 'Automatic Insight Engine'    }, position: { x: GAP_X * 2, y: 160 } },
  { id: '4', type: 'custom', data: { label: 'Strategy Recs',       icon: LineChart,    type: 'action',    description: 'AI-driven Next Steps'        }, position: { x: GAP_X * 3, y: 40  } },
  { id: '5', type: 'custom', data: { label: 'Real-time Sync',      icon: Activity,     type: 'action',    description: 'Instant Dashboard Update'    }, position: { x: GAP_X * 3, y: 290 } },
  { id: '6', type: 'custom', data: { label: 'Business Growth',     icon: CheckCircle2, type: 'action',    description: 'Automated Scalability'       }, position: { x: GAP_X * 4.2, y: 160 } },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true,  style: { stroke: '#22c55e', strokeWidth: 2.5 } },
  { id: 'e2-3', source: '2', target: '3', animated: true,  style: { stroke: '#22c55e', strokeWidth: 2.5 } },
  { id: 'e3-4', source: '3', target: '4', label: 'Positive', labelStyle: { fill: '#16a34a', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: 'rgba(255,255,255,0.8)' }, style: { stroke: '#facc15', strokeWidth: 2 } },
  { id: 'e3-5', source: '3', target: '5', label: 'Verified', labelStyle: { fill: '#16a34a', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: 'rgba(255,255,255,0.8)' }, style: { stroke: '#facc15', strokeWidth: 2 } },
  { id: 'e4-6', source: '4', target: '6', animated: true,  style: { stroke: '#22c55e', strokeWidth: 2.5 } },
  { id: 'e5-6', source: '5', target: '6', animated: true,  style: { stroke: '#22c55e', strokeWidth: 2.5 } },
];

/* ─── Feature Data ────────────────────────────────────────── */
const FEATURES = [
  { icon: Zap,          accent: '#22c55e', bg: 'rgba(34,197,94,0.08)',   label: 'No-Code Intelligence', body: 'Visual drag-and-drop interface for complex business logic. Build in minutes, not months.' },
  { icon: Brain,        accent: '#facc15', bg: 'rgba(250,204,21,0.08)',  label: 'Predictive Models',    body: 'Automated risk assessment and revenue forecasting baked into every single workflow step.' },
  { icon: CheckCircle2, accent: '#22c55e', bg: 'rgba(134,239,172,0.10)', label: 'Enterprise Grade',     body: '99.9% uptime with built-in retries and edge-case handling for mission-critical operations.' },
];

/* ─── Main Component ───────────────────────────────────────── */
export default function WorkflowShowcase() {
  const [mounted, setMounted] = useState(false);
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      padding: '120px 0 100px',
      background: 'hsl(var(--background))',
    }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Familjen+Grotesk:wght@700;800&display=swap');

        @keyframes wf-ping {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.2; transform:scale(1.8); }
        }
        @keyframes wf-fadeUp {
          from { opacity:0; transform:translateY(30px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .wf-up   { opacity:0; animation: wf-fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .wf-up-1 { animation-delay:0.1s; }
        .wf-up-2 { animation-delay:0.25s; }
        .wf-up-3 { animation-delay:0.4s; }

        .wf-feat { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .wf-feat:hover { transform:translateY(-8px); box-shadow:0 30px 60px rgba(0,0,0,0.08) !important; border-color: rgba(34,197,94,0.3) !important; }

        .wf-btn-primary { transition: all 0.3s ease; }
        .wf-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(34, 197, 94, 0.35) !important; }
        
        .wf-flow-container {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }

        .react-flow__edge-path {
          stroke-dasharray: 10;
          animation: wf-edge-flow 20s linear infinite;
        }
        @keyframes wf-edge-flow {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Ambient Blobs */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(250,204,21,0.06) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', position: 'relative', zIndex: 10 }}>

        {/* ── Header ── */}
        <div className={mounted ? 'wf-up wf-up-1' : ''} style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 80px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 16px', borderRadius: 999,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
            marginBottom: 24,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#16a34a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Visual Automation Hub
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Familjen Grotesk', sans-serif",
            fontSize: 'clamp(40px, 5vw, 64px)',
            fontWeight: 800, lineHeight: 1,
            color: 'hsl(var(--foreground))',
            margin: '0 0 24px', letterSpacing: '-0.03em',
          }}>
            Automate Your{' '}
            <span style={{
              backgroundImage: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #facc15 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Business DNA
            </span>
          </h2>

          <p style={{ fontSize: 20, lineHeight: 1.6, color: 'hsl(var(--muted-foreground))', margin: '0 auto 32px', maxWidth: 660, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            The worlds leading visual workflow builder for data-driven companies. 
            Transform manual chaos into automated precision.
          </p>
        </div>

        {/* ── Visual Flow Canvas ── */}
        <div 
          className={`wf-flow-container ${mounted ? 'wf-up wf-up-2' : ''}`} 
          style={{ width: '100%', height: 500, marginBottom: 80, position: 'relative' }}
        >
          {/* Subtle Grid under the flow */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(34,197,94,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px', pointerEvents: 'none',
          }} />

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            minZoom={0.5}
            maxZoom={1.5}
            nodesDraggable={true}
            panOnDrag={true}
            zoomOnScroll={false}
            proOptions={{ hideAttribution: true }}
            style={{ background: 'transparent' }}
          />
        </div>

        {/* ── Stats & Features ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, marginTop: 40 }}>
          {FEATURES.map(({ icon: Icon, accent, bg, label, body }, idx) => (
            <div 
              key={label} 
              className={`wf-feat ${mounted ? `wf-up wf-up-3` : ''}`}
              style={{
                padding: '40px', borderRadius: 24,
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                animationDelay: `${0.4 + idx * 0.1}s`,
              }}
            >
              <div style={{ 
                width: 56, height: 56, borderRadius: 16, 
                background: bg, border: `1px solid ${accent}22`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                marginBottom: 28 
              }}>
                <Icon size={24} style={{ color: accent }} />
              </div>
              <h4 style={{ 
                fontFamily: "'Familjen Grotesk', sans-serif", 
                fontSize: 22, fontWeight: 700, 
                color: 'hsl(var(--foreground))', 
                margin: '0 0 12px', letterSpacing: '-0.02em' 
              }}>
                {label}
              </h4>
              <p style={{ 
                fontSize: 16, color: 'hsl(var(--muted-foreground))', 
                lineHeight: 1.7, margin: 0, 
                fontFamily: "'Plus Jakarta Sans', sans-serif" 
              }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className={mounted ? 'wf-up' : ''} style={{ animationDelay: '0.8s', display: 'flex', justifyContent: 'center', marginTop: 80 }}>
          <button 
            className="wf-btn-primary" 
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '18px 48px', borderRadius: 12, 
              fontSize: 18, fontWeight: 700,
              background: '#22c55e', border: 'none', color: '#fff', 
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Start Refining Your Data <ArrowRight size={20} />
          </button>
        </div>

      </div>
    </section>
  );
}