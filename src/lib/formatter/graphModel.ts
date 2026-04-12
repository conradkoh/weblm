/**
 * Graph Model — parses markdown into a hierarchical graph data structure.
 * Headers become nodes in a tree/graph structure.
 */

export interface GraphNode {
  id: string;
  level: number; // 0 = h1, 1 = h2, etc.
  title: string;
  content: string;
  children: string[]; // child node IDs
  parentId: string | null;
  metadata?: {
    lineStart: number;
    lineEnd: number;
  };
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  rootIds: string[]; // Top-level header IDs
  orderedIds: string[]; // Nodes in document order
}

let nodeCounter = 0;

/**
 * Reset the node counter (for testing purposes).
 */
export function resetNodeCounter(): void {
  nodeCounter = 0;
}

/**
 * Generate a unique node ID.
 */
function generateNodeId(): string {
  return `node_${++nodeCounter}`;
}

/**
 * Parse markdown content into a hierarchical graph.
 * Headers become nodes with children representing their content sections.
 */
export function parseMarkdownToGraph(markdown: string): Graph {
  const nodes = new Map<string, GraphNode>();
  const rootIds: string[] = [];
  const orderedIds: string[] = [];

  if (!markdown.trim()) {
    return { nodes, rootIds, orderedIds };
  }

  const lines = markdown.split('\n');
  let currentNode: GraphNode | null = null;
  let currentContent: string[] = [];
  let lastNodeId: string | null = null;

  function finalizeNode(node: GraphNode, contentLines: string[]): void {
    node.content = contentLines.join('\n').trim();
    if (node.content || node.level === 0) {
      // Only add if there's content or it's a root
      nodes.set(node.id, node);
      orderedIds.push(node.id);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmedLine = line.trim();

    // Check for headers
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Save previous node's content
      if (currentNode) {
        finalizeNode(currentNode, currentContent);
      }

      const level = (headerMatch[1] ?? '').length - 1; // 0-indexed
      const title = (headerMatch[2] ?? '').trim();
      const newNodeId = generateNodeId();

      // Find parent (most recent node with lower level)
      let parentId: string | null = null;
      if (level > 0) {
        const allNodes = Array.from(nodes.values());
        for (let j = allNodes.length - 1; j >= 0; j--) {
          const node = allNodes[j];
          if (node && node.level < level) {
            parentId = node.id;
            break;
          }
        }
      }

      const newNode: GraphNode = {
        id: newNodeId,
        level,
        title,
        content: '',
        children: [],
        parentId,
        metadata: {
          lineStart: i + 1,
          lineEnd: i + 1,
        },
      };

      // Add as child to parent
      if (parentId) {
        const parent = nodes.get(parentId);
        if (parent) {
          parent.children.push(newNodeId);
        }
      } else {
        rootIds.push(newNodeId);
      }

      currentNode = newNode;
      currentContent = [];
      lastNodeId = newNodeId;

    } else if (currentNode && line) {
      // Add to current node's content
      currentContent.push(line);
    } else if (!currentNode && line) {
      // Content before any header - create implicit root
      if (currentContent.length === 0) {
        const rootId = generateNodeId();
        currentNode = {
          id: rootId,
          level: -1, // Implicit root
          title: 'Document',
          content: '',
          children: [],
          parentId: null,
        };
        rootIds.push(rootId);
      }
      currentContent.push(line);
    }
  }

  // Don't forget the last node
  if (currentNode) {
    finalizeNode(currentNode, currentContent);
  }

  return { nodes, rootIds, orderedIds };
}

/**
 * Get a node by ID.
 */
export function getNode(graph: Graph, nodeId: string): GraphNode | undefined {
  return graph.nodes.get(nodeId);
}

/**
 * Get all root nodes (top-level headers).
 */
export function getRootNodes(graph: Graph): GraphNode[] {
  return graph.rootIds
    .map(id => graph.nodes.get(id))
    .filter((n): n is GraphNode => n !== undefined);
}

/**
 * Get children of a node.
 */
export function getChildren(graph: Graph, nodeId: string): GraphNode[] {
  const node = graph.nodes.get(nodeId);
  if (!node) return [];
  return node.children
    .map(id => graph.nodes.get(id))
    .filter((n): n is GraphNode => n !== undefined);
}

/**
 * Get all nodes as an array in document order.
 */
export function getOrderedNodes(graph: Graph): GraphNode[] {
  return graph.orderedIds
    .map(id => graph.nodes.get(id))
    .filter((n): n is GraphNode => n !== undefined);
}

/**
 * Get a breadcrumb path from root to a node.
 */
export function getBreadcrumbPath(graph: Graph, nodeId: string): GraphNode[] {
  const path: GraphNode[] = [];
  let current = graph.nodes.get(nodeId);

  while (current) {
    path.unshift(current);
    current = current.parentId ? graph.nodes.get(current.parentId) : undefined;
  }

  return path;
}

/**
 * Get the depth of a node (number of ancestors).
 */
export function getNodeDepth(graph: Graph, nodeId: string): number {
  let depth = 0;
  let current = graph.nodes.get(nodeId);

  while (current?.parentId) {
    depth++;
    current = graph.nodes.get(current.parentId);
  }

  return depth;
}

/**
 * Count total nodes in the graph.
 */
export function getNodeCount(graph: Graph): number {
  return graph.nodes.size;
}

/**
 * Get a flat list of all node contents.
 */
export function flattenGraph(graph: Graph): string[] {
  return getOrderedNodes(graph)
    .filter(n => n.content.trim())
    .map(n => `## ${n.title}\n\n${n.content}`);
}

/**
 * Export graph to a simplified JSON structure.
 */
export function exportGraphToJson(graph: Graph): object {
  return {
    nodeCount: graph.nodes.size,
    roots: graph.rootIds.length,
    nodes: getOrderedNodes(graph).map(n => ({
      id: n.id,
      level: n.level,
      title: n.title,
      content: n.content,
      hasChildren: n.children.length > 0,
    })),
  };
}