from flask import Flask, render_template, request, jsonify, send_from_directory
import numpy as np
import networkx as nx
import random

app = Flask(__name__)

# Define the function before calling it
def create_neural_network(num_neurons, num_layers):
    G = nx.DiGraph()  # {{ edit_36 }} Confirmed use of DiGraph
    neurons_per_layer = num_neurons // num_layers

    # Create nodes with layer attribute
    for i in range(num_neurons):
        layer = i // neurons_per_layer
        G.add_node(i, layer=layer)
    
    # Create connections with modularity and clustering
    connection_prob = 0.2  # Increased connection probability for clustering
    for i in range(num_neurons):
        for j in range(i + 1, num_neurons):
            layer_i = G.nodes[i]['layer']
            layer_j = G.nodes[j]['layer']
            if abs(layer_i - layer_j) <= 1:
                if random.random() < connection_prob:
                    G.add_edge(i, j, weight=random.uniform(0.1, 1))
    
    # Add some long-range connections to simulate brain's long-range axons
    long_range_prob = 0.05  # Reduced long-range connection probability
    for _ in range(int(num_neurons * long_range_prob)):
        source = random.randint(0, num_neurons - 1)
        target = random.randint(0, num_neurons - 1)
        if source != target and not G.has_edge(source, target):
            G.add_edge(source, target, weight=random.uniform(0.05, 0.5))
    
    return G

# Generate the neural network once and store it globally
G = create_neural_network(100, 5)

def propagate_thought(input_thought):
    print(f"G is a {type(G)}")  # {{ edit_37 }} Debugging statement
    activations = {node: 0 for node in G.nodes()}
    for i, char in enumerate(input_thought):
        if i < len(G):
            activations[i] = ord(char) / 255
    
    propagation = []
    for _ in range(10):  # Increased number of propagation steps for smoother effect
        new_activations = activations.copy()
        for node in G.nodes():
            incoming = list(G.predecessors(node))  # Now valid with DiGraph
            if incoming:
                activation = sum(activations[pred] * G[pred][node]['weight'] for pred in incoming)
                new_activations[node] = 1 / (1 + np.exp(-activation))  # Sigmoid activation
        activations = new_activations
        propagation.append([{"id": node, "value": activations[node]} for node in G.nodes()])
    
    return propagation

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/static/<path:path>")
def send_static(path):
    return send_from_directory('static', path)

@app.route("/process", methods=["POST"])
def process_input():
    user_input = request.json.get("input")
    print(f"Received input: {user_input}")  # Debug log
    if user_input == "initial":
        propagation = []
    else:
        propagation = propagate_thought("default thought")
    
    nodes = [{"id": node, "layer": G.nodes[node]['layer']} for node in G.nodes()]
    edges = [{"source": edge[0], "target": edge[1], "weight": G.edges[edge]['weight']} for edge in G.edges()]
    
    print(f"Returning propagation data with {len(propagation)} steps.")  # Debug log
    
    return jsonify({"nodes": nodes, "edges": edges, "propagation": propagation})

if __name__ == "__main__":
    app.run(debug=True)