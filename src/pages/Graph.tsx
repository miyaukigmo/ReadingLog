import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import ForceGraph2D from 'react-force-graph-2d';
import { BookOpen, User, Hash, X, Network, Filter } from 'lucide-react';

type NodeType = 'document' | 'person' | 'category';

interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  val: number; // Size
  color: string;
  data?: any;
}

interface GraphLink {
  source: string;
  target: string;
  color?: string;
}

export default function GraphView() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [showDocuments, setShowDocuments] = useState(true);
  const [showPeople, setShowPeople] = useState(true);
  const [showCategories, setShowCategories] = useState(false);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Resize observer to make graph responsive
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setContainerDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, peopleRes] = await Promise.all([
        supabase.from('documents').select('id, title, categories, type, summary'),
        supabase.from('person_entries').select('id, name, document_id, display_summary, fields')
      ]);

      if (docsRes.data) setDocuments(docsRes.data);
      if (peopleRes.data) setPeople(peopleRes.data);
    } catch (error) {
      console.error('Error fetching data for graph:', error);
    } finally {
      setLoading(false);
    }
  };

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    const addNode = (node: GraphNode) => {
      if (!nodeIds.has(node.id)) {
        nodes.push(node);
        nodeIds.add(node.id);
      }
    };

    const addLink = (source: string, target: string) => {
      if (nodeIds.has(source) && nodeIds.has(target)) {
        links.push({ source, target, color: '#e5e7eb' });
      }
    };

    // 1. Documents
    if (showDocuments) {
      documents.forEach(doc => {
        addNode({
          id: `doc-${doc.id}`,
          name: doc.title,
          type: 'document',
          val: 20,
          color: '#93c5fd', // Pastel blue
          data: doc
        });
      });
    }

    // 2. People
    if (showPeople) {
      people.forEach(person => {
        addNode({
          id: `person-${person.id}`,
          name: person.name,
          type: 'person',
          val: 15,
          color: '#f9a8d4', // Pastel pink
          data: person
        });

        // Link person to document
        if (showDocuments && person.document_id) {
          addLink(`person-${person.id}`, `doc-${person.document_id}`);
        }
      });
    }

    // 3. Categories
    if (showCategories) {
      const categories = new Set<string>();
      documents.forEach(doc => {
        if (doc.categories) {
          doc.categories.forEach((cat: string) => categories.add(cat));
        }
      });

      categories.forEach(cat => {
        addNode({
          id: `cat-${cat}`,
          name: cat,
          type: 'category',
          val: 12,
          color: '#fde047', // Pastel yellow
          data: { title: cat }
        });
      });

      // Link docs to categories
      if (showDocuments) {
        documents.forEach(doc => {
          if (doc.categories) {
            doc.categories.forEach((cat: string) => {
              addLink(`doc-${doc.id}`, `cat-${cat}`);
            });
          }
        });
      }
    }

    return { nodes, links };
  }, [documents, people, showDocuments, showPeople, showCategories]);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as GraphNode);
    // Center map on node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(2, 1000);
    }
  }, []);

  // Custom node rendering for text
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = Math.max(12 / globalScale, 2);
    ctx.font = `${fontSize}px Inter, sans-serif`;
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    // Draw text
    if (globalScale > 0.8) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#374151'; // text-gray-700
      ctx.fillText(label, node.x, node.y + (node.val / 2) + fontSize + (2/globalScale));
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <Network className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Knowledge Graph</h1>
            <p className="text-xs text-gray-500">知識のつながりを探索する</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
          <Filter className="h-4 w-4 text-gray-400 ml-2" />
          <button
            onClick={() => setShowDocuments(!showDocuments)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showDocuments ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            本・資料
          </button>
          <button
            onClick={() => setShowPeople(!showPeople)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showPeople ? 'bg-pink-100 text-pink-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            人物
          </button>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showCategories ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            カテゴリー
          </button>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative flex overflow-hidden">
        <div ref={containerRef} className="flex-1 h-full relative cursor-move">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              width={containerDimensions.width}
              height={containerDimensions.height}
              graphData={graphData}
              nodeCanvasObject={paintNode}
              onNodeClick={handleNodeClick}
              linkColor={(link: any) => link.color}
              linkWidth={1.5}
              backgroundColor="#f8fafc" // slate-50
              d3VelocityDecay={0.3} // Make it less jittery
              cooldownTicks={100} // Stop simulating after a while to save CPU
            />
          )}
        </div>

        {/* Sidebar Details Panel */}
        {selectedNode && (
          <div className="w-80 bg-white border-l border-gray-100 shadow-xl z-20 flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="p-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-2">
                {selectedNode.type === 'document' && <BookOpen className="h-5 w-5 text-blue-500" />}
                {selectedNode.type === 'person' && <User className="h-5 w-5 text-pink-500" />}
                {selectedNode.type === 'category' && <Hash className="h-5 w-5 text-yellow-500" />}
                <span className="font-medium text-gray-500 capitalize">{selectedNode.type}</span>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedNode.name}</h2>
              
              {selectedNode.type === 'document' && (
                <div className="space-y-4">
                  {selectedNode.data?.type && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Type</span>
                      <p className="mt-1 text-sm text-gray-700 bg-gray-50 inline-block px-2 py-1 rounded">{selectedNode.data.type}</p>
                    </div>
                  )}
                  {selectedNode.data?.categories && selectedNode.data.categories.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Categories</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedNode.data.categories.map((c: string) => (
                          <span key={c} className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-100">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedNode.data?.summary && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Summary</span>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">{selectedNode.data.summary}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type === 'person' && (
                <div className="space-y-4">
                  {selectedNode.data?.fields && selectedNode.data.fields.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Fields</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedNode.data.fields.map((f: string) => (
                          <span key={f} className="text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedNode.data?.display_summary && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Summary</span>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">{selectedNode.data.display_summary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-50 bg-gray-50">
              {selectedNode.type === 'document' && (
                <a href={`/document/${selectedNode.data.id}`} className="block w-full py-2 text-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
                  詳細を見る
                </a>
              )}
              {selectedNode.type === 'person' && (
                <a href={`/people?id=${selectedNode.data.id}`} className="block w-full py-2 text-center text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 rounded-lg shadow-sm transition-colors">
                  人物事典で見る
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
