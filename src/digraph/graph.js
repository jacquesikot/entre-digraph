import * as React from 'react';

import { GraphView } from 'react-digraph';
import GraphConfig, {
  edgeTypes,
  EMPTY_EDGE_TYPE,
  EMPTY_TYPE,
  NODE_KEY,
  nodeTypes,
  // COMPLEX_CIRCLE_TYPE,
  POLY_TYPE,
  // SPECIAL_CHILD_SUBTYPE,
  SPECIAL_EDGE_TYPE,
  SPECIAL_TYPE,
  SKINNY_TYPE,
} from './graph-config'; // Configures node/edge types

const sample = {
  edges: [],
  nodes: [
    {
      id: 'start1',
      title: 'Start (0)',
      type: SPECIAL_TYPE,
    },
    {
      id: 'a1',
      title: 'Node A (1)',
      type: SKINNY_TYPE,
      x: 258.3976135253906,
      y: 331.9783248901367,
    },
    {
      id: 'a2',
      subtype: POLY_TYPE,
      title: 'Node B (2)',
      type: EMPTY_TYPE,
      x: 593.9393920898438,
      y: 260.6060791015625,
    },
  ],
};

function generateSample(totalNodes) {
  const generatedSample = {
    edges: [],
    nodes: [],
  };
  let y = 0;
  let x = 0;

  const numNodes = totalNodes;

  // generate large array of nodes
  // These loops are fast enough. 1000 nodes = .45ms + .34ms
  // 2000 nodes = .86ms + .68ms
  // implying a linear relationship with number of nodes.
  for (let i = 1; i <= numNodes; i++) {
    if (i % 20 === 0) {
      y++;
      x = 0;
    } else {
      x++;
    }

    generatedSample.nodes.push({
      id: `a${i}`,
      title: `Node ${i}`,
      type: nodeTypes[Math.floor(nodeTypes.length * Math.random())],
      x: 0 + 200 * x,
      y: 0 + 200 * y,
    });
  }
  // link each node to another node
  for (let i = 1; i < numNodes; i++) {
    generatedSample.edges.push({
      source: `a${i}`,
      target: `a${i + 1}`,
      type: edgeTypes[Math.floor(edgeTypes.length * Math.random())],
    });
  }

  return generatedSample;
}

const addToSessionStore = (key, item) => {
  const value = JSON.stringify(item);
  sessionStorage.setItem(key, value);
};

// const getFromSessionStore = (key) => {
//   const value = sessionStorage.getItem(key);
//   const returnedValue = JSON.parse(value);
//   if (value) {
//     return returnedValue;
//   } else {
//     return sample;
//   }
// };

class Graph extends React.Component {
  GraphView;

  constructor(props) {
    super(props);

    this.state = {
      copiedNode: null,
      copiedNodes: null,
      copiedEdges: null,
      graph: sample,
      layoutEngineType: undefined,
      selected: null,
      selectedNodes: null,
      selectedEdges: null,
      totalNodes: sample.nodes.length,
      allowMultiselect: true,
      newNodeTitle: '',
      newEdgeTitle: '',
    };

    this.GraphView = React.createRef();
  }

  componentDidMount() {
    addToSessionStore('graph', sample);
  }

  // Helper to find the index of a given node
  getNodeIndex(searchNode) {
    return this.state.graph.nodes.findIndex((node) => {
      return node[NODE_KEY] === searchNode[NODE_KEY];
    });
  }

  // Helper to find the index of a given edge
  getEdgeIndex(searchEdge) {
    return this.state.graph.edges.findIndex((edge) => {
      return (
        edge.source === searchEdge.source && edge.target === searchEdge.target
      );
    });
  }

  // Given a nodeKey, return the corresponding node
  getViewNode(nodeKey) {
    const searchNode = {};

    searchNode[NODE_KEY] = nodeKey;
    const i = this.getNodeIndex(searchNode);

    return this.state.graph.nodes[i];
  }

  makeItLarge = () => {
    const graph = this.state.graph;
    const generatedSample = generateSample(this.state.totalNodes);

    graph.nodes = generatedSample.nodes;
    graph.edges = generatedSample.edges;
    this.setState(this.state);
  };

  addStartNode = () => {
    const graph = this.state.graph;

    // using a new array like this creates a new memory reference
    // this will force a re-render
    graph.nodes = [
      {
        id: Date.now(),
        title: 'Node A',
        type: SPECIAL_TYPE,
        x: 0,
        y: 0,
      },
      ...this.state.graph.nodes,
    ];
    this.setState({
      graph,
    });
  };
  deleteStartNode = () => {
    const graph = this.state.graph;

    graph.nodes.splice(0, 1);
    // using a new array like this creates a new memory reference
    // this will force a re-render
    graph.nodes = [...this.state.graph.nodes];
    this.setState({
      graph,
    });
  };

  handleChange = (event) => {
    this.setState(
      {
        totalNodes: parseInt(event.target.value || '0', 10),
      },
      this.makeItLarge
    );
  };

  /*
   * Handlers/Interaction
   */

  // Called by 'drag' handler, etc..
  // to sync updates from D3 with the graph
  onUpdateNode = (viewNode, selectedNodes) => {
    const graph = this.state.graph;
    const i = this.getNodeIndex(viewNode);

    graph.nodes[i] = viewNode;
    this.setState({ graph });
    //addToSessionStore('graph', graph);
  };

  onSelect = (selected) => {
    this.setState({
      selected,
    });
  };

  // Updates the graph with a new node
  onCreateNode = (x, y) => {
    const graph = this.state.graph;

    // This is just an example - any sort of logic
    // could be used here to determine node type
    // There is also support for subtypes. (see 'sample' above)
    // The subtype geometry will underlay the 'type' geometry for a node
    const type = Math.random() < 0.25 ? SPECIAL_TYPE : EMPTY_TYPE;

    const viewNode = {
      id: Date.now(),
      title: '',
      type,
      x,
      y,
    };

    graph.nodes = [...graph.nodes, viewNode];
    this.setState({ graph });
  };

  // Deletes a node from the graph
  onDeleteNode = (viewNode, nodeId, nodeArr) => {
    // Note: onDeleteEdge is also called from react-digraph for connected nodes
    const graph = this.state.graph;

    graph.nodes = nodeArr;

    this.deleteEdgesForNode(nodeId);

    this.setState({ graph, selected: null });
  };

  // Whenever a node is deleted the consumer must delete any connected edges.
  // react-digraph won't call deleteEdge for multi-selected edges, only single edge selections.
  deleteEdgesForNode(nodeID) {
    const { graph } = this.state;
    const edgesToDelete = graph.edges.filter(
      (edge) => edge.source === nodeID || edge.target === nodeID
    );

    const newEdges = graph.edges.filter(
      (edge) => edge.source !== nodeID && edge.target !== nodeID
    );

    edgesToDelete.forEach((edge) => {
      this.onDeleteEdge(edge, newEdges);
    });
  }

  // Creates a new node between two edges
  onCreateEdge = (sourceViewNode, targetViewNode) => {
    const graph = this.state.graph;
    // This is just an example - any sort of logic
    // could be used here to determine edge type
    const type =
      sourceViewNode.type === SPECIAL_TYPE
        ? SPECIAL_EDGE_TYPE
        : EMPTY_EDGE_TYPE;

    const viewEdge = {
      source: sourceViewNode[NODE_KEY],
      target: targetViewNode[NODE_KEY],
      type,
    };

    // Only add the edge when the source node is not the same as the target
    if (viewEdge.source !== viewEdge.target) {
      graph.edges = [...graph.edges, viewEdge];
      this.setState({
        graph,
        selected: {
          nodes: null,
          edges: new Map([[`${viewEdge.source}_${viewEdge.target}`, viewEdge]]),
        },
      });
    }
  };

  // Called when an edge is reattached to a different target.
  onSwapEdge = (sourceViewNode, targetViewNode, viewEdge) => {
    const graph = this.state.graph;
    const i = this.getEdgeIndex(viewEdge);
    const edge = JSON.parse(JSON.stringify(graph.edges[i]));

    edge.source = sourceViewNode[NODE_KEY];
    edge.target = targetViewNode[NODE_KEY];
    graph.edges[i] = edge;
    // reassign the array reference if you want the graph to re-render a swapped edge
    graph.edges = [...graph.edges];

    this.setState({
      graph,
      selected: edge,
    });
  };

  // Called when an edge is deleted
  onDeleteEdge = (viewEdge, edges) => {
    const graph = this.state.graph;

    graph.edges = edges;
    this.setState({
      graph,
      selected: null,
    });
  };

  onUndo = () => {
    // Not implemented
    console.warn('Undo is not currently implemented in the example.');
    // Normally any add, remove, or update would record the action in an array.
    // In order to undo it one would simply call the inverse of the action performed. For instance, if someone
    // called onDeleteEdge with (viewEdge, i, edges) then an undelete would be a splicing the original viewEdge
    // into the edges array at position i.
  };

  onCopySelected = () => {
    // This is a no-op. Maybe log something if you want.
    // Pasting uses the state.selected property within the onPasteSelected function.
  };

  // Pastes the selection to mouse position
  onPasteSelected = (selection, mousePosition) => {
    const { graph, selected } = this.state;
    const { x: mouseX, y: mouseY } = mousePosition || { x: 0, y: 0 };

    if (!selected?.nodes?.size) {
      // do nothing if there are no nodes selected
      return;
    }

    let cornerX;
    let cornerY;

    selected.nodes.forEach((copiedNode) => {
      // find left-most node and record x position
      if (cornerX == null || (copiedNode.x || 0) < cornerX) {
        cornerX = copiedNode.x || 0;
      }

      // find top-most node and record y position
      if (cornerY == null || (copiedNode.y || 0) < cornerY) {
        cornerY = copiedNode.y || 0;
      }
    });

    // Keep track of the mapping of old IDs to new IDs
    // so we can recreate the edges
    const newIDs = {};

    // Every node position is relative to the top and left-most corner
    const newNodes = new Map(
      [...(selected?.nodes?.values() || [])].map((copiedNode) => {
        const x = mouseX + ((copiedNode.x || 0) - cornerX);
        const y = mouseY + ((copiedNode.y || 0) - cornerY);

        // Here you would usually create a new node using an API
        // We don't have an API, so we'll mock out the node ID
        // and create a copied node.
        const id = `${copiedNode.id}_${Date.now()}`;

        newIDs[copiedNode.id] = id;

        return [
          id,
          {
            ...copiedNode,
            id,
            x,
            y,
          },
        ];
      })
    );

    const newEdges = new Map(
      [...(selected?.edges?.values() || [])].map((copiedEdge) => {
        const source = newIDs[copiedEdge.source];
        const target = newIDs[copiedEdge.target];

        return [
          `${source}_${target}`,
          {
            ...copiedEdge,
            source,
            target,
          },
        ];
      })
    );

    graph.nodes = [...graph.nodes, ...Array.from(newNodes.values())];
    graph.edges = [...graph.edges, ...Array.from(newEdges.values())];

    // Select the new nodes and edges
    this.setState({
      selected: {
        nodes: newNodes,
        edges: newEdges,
      },
    });
  };

  handleChangeLayoutEngineType = (event) => {
    const value = event.target.value;
    const layoutEngineType = value;

    this.setState({
      layoutEngineType,
    });
  };

  onSelectPanNode = (event) => {
    if (this.GraphView) {
      this.GraphView.panToNode(event.target.value, true);
    }
  };

  setNodeTitle = (event) => {
    this.setState({ newNodeTitle: event.target.value });
  };

  editNodeName = (selected) => {
    if (selected === null) return alert('Please select a node first');

    if (this.state.newNodeTitle === '')
      return alert('Node title cannot be empty');

    for (let select of selected.nodes) {
      const indexOfNode = this.state.graph.nodes.findIndex(
        (n) => n.title === select[1].title
      );
      const graph = this.state.graph;

      graph.nodes[indexOfNode].title = this.state.newNodeTitle;

      this.setState({ graph });
      addToSessionStore('graph', graph);

      this.onSelect(null);
    }
  };

  setEdgeTitle = (event) => {
    this.setState({ newEdgeTitle: event.target.value });
  };

  editEdgeTitle = (selected) => {
    for (let edge of selected.edges) {
      this.state.graph.edges.findIndex((n) => console.log(edge));
    }
  };

  /*
   * Render
   */

  render() {
    const { nodes, edges } = this.state.graph;
    const { selected, allowMultiselect, layoutEngineType } = this.state;
    const { NodeTypes, NodeSubtypes, EdgeTypes } = GraphConfig;

    return (
      <>
        <div className="graph-header">
          <button onClick={this.addStartNode}>Add Node</button>
          <button onClick={this.deleteStartNode}>Delete Node</button>
          <input
            className="total-nodes"
            type="number"
            onBlur={this.handleChange}
            placeholder={this.state.totalNodes.toString()}
          />
          <div className="layout-engine">
            <span>Layout Engine:</span>
            <select
              name="layout-engine-type"
              onChange={this.handleChangeLayoutEngineType}
            >
              <option value={undefined}>None</option>
              <option value={'SnapToGrid'}>Snap to Grid</option>
              <option value={'VerticalTree'}>Vertical Tree</option>
            </select>
          </div>
          <div className="pan-list">
            <span>Pan To:</span>
            <select onChange={this.onSelectPanNode}>
              {nodes.map((node) => (
                <option key={node[NODE_KEY]} value={node[NODE_KEY]}>
                  {node.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <input
          type="text"
          onChange={this.setNodeTitle}
          placeholder="Node Title"
        />
        <button onClick={() => this.editNodeName(selected)}>Set Title</button>
        <div>
          <input
            type="text"
            onChange={this.setEdgeTitle}
            placeholder="Edge Title"
          />
          <button onClick={() => this.editEdgeTitle(selected)}>
            Set Edge Title
          </button>
        </div>
        <div id="graph" style={{ height: 600 }}>
          <GraphView
            ref={(el) => (this.GraphView = el)}
            allowMultiselect={allowMultiselect}
            nodeKey={NODE_KEY}
            nodes={nodes}
            edges={edges}
            selected={selected}
            nodeTypes={NodeTypes}
            nodeSubtypes={NodeSubtypes}
            edgeTypes={EdgeTypes}
            onSelect={this.onSelect}
            onCreateNode={this.onCreateNode}
            onUpdateNode={this.onUpdateNode}
            onDeleteNode={this.onDeleteNode}
            onCreateEdge={this.onCreateEdge}
            onSwapEdge={this.onSwapEdge}
            onDeleteEdge={this.onDeleteEdge}
            onUndo={this.onUndo}
            onCopySelected={this.onCopySelected}
            onPasteSelected={this.onPasteSelected}
            layoutEngineType={layoutEngineType}
          />
        </div>
      </>
    );
  }
}

export default Graph;
