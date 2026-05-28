import json
import networkx as nx
from networkx.readwrite import json_graph
from pathlib import Path

BASE = Path(r'C:\\Users\\Lenovo T470s\\Desktop\\Aliasger\\Projects\\ZMade\\zmade-new')
data = json.loads((BASE / 'graphify-out' / 'graph.json').read_text(encoding='utf-8'))
G = json_graph.node_link_graph(data, edges='links')

def neighbors_all(G, n):
    return list(G.neighbors(n))

def bfs_subgraph(G, start_labels, depth=2):
    start_nodes = []
    for term in start_labels:
        t = term.lower()
        scored = sorted([(sum(1 for w in t.split() if w in G.nodes[n].get('label','').lower()), n) for n in G.nodes()], reverse=True)
        if scored and scored[0][0] > 0:
            start_nodes.append(scored[0][1])
    return start_nodes

print("=== Q1: lib/utils — why it bridges 3 communities ===")
starts = bfs_subgraph(G, ['lib/utils', 'formatDate', 'formatKWD'])
for nid in starts[:1]:
    lbl = G.nodes[nid].get('label', nid)
    comm = G.nodes[nid].get('community', '?')
    print("NODE: " + lbl[:80] + " (community=" + str(comm) + ")")
    nbs = neighbors_all(G, nid)
    for nb in nbs:
        e = G.edges.get((nid, nb)) or G.edges.get((nb, nid), {})
        rel = e.get('relation', '?')
        nb_comm = G.nodes[nb].get('community', '?')
        nb_lbl = G.nodes[nb].get('label', nb)
        print("  [comm=" + str(nb_comm) + "] " + nb_lbl[:60] + " [" + rel + "]")

print()
print("=== Q2: Settings Module Pages (community 0) — split analysis ===")
comm0_nodes = [n for n, d in G.nodes(data=True) if d.get('community') == 0]
internal = [(u,v) for u,v in G.edges() if u in comm0_nodes and v in comm0_nodes]
external = [(u,v) for u,v in G.edges() if (u in comm0_nodes) != (v in comm0_nodes)]
print("Nodes: " + str(len(comm0_nodes)) + ", Internal edges: " + str(len(internal)) + ", External edges: " + str(len(external)))
paths = {}
for n in comm0_nodes:
    src = G.nodes[n].get('source_file', '')
    key = '/'.join(src.replace('\\','/').split('/')[-3:-1]) if src else 'unknown'
    paths.setdefault(key, []).append(G.nodes[n].get('label', n)[:45])
print("Natural sub-groups by file path:")
for k, v in sorted(paths.items(), key=lambda x: -len(x[1]))[:12]:
    print("  [" + str(len(v)) + "] " + k + ": " + ", ".join(v[:3]) + ("..." if len(v)>3 else ""))
print("Sample internal edges:")
for u,v in internal[:6]:
    e = G.edges[u,v]
    print("  " + G.nodes[u].get('label',u)[:40] + " -[" + e.get('relation','?') + "]-> " + G.nodes[v].get('label',v)[:40])

print()
print("=== Q3: Customer Server Actions bridge ===")
starts3 = bfs_subgraph(G, ['customer server actions', 'lib/actions/customers'])
for nid in starts3[:2]:
    lbl = G.nodes[nid].get('label', nid)
    comm = G.nodes[nid].get('community', '?')
    print("NODE: " + lbl[:70] + " (community=" + str(comm) + ")")
    for nb in neighbors_all(G, nid):
        e = G.edges.get((nid, nb)) or G.edges.get((nb, nid), {})
        rel = e.get('relation', '?')
        nb_comm = G.nodes[nb].get('community', '?')
        print("  [comm=" + str(nb_comm) + "] " + G.nodes[nb].get('label', nb)[:60] + " [" + rel + "]")