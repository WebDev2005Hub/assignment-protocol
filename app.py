from flask import Flask, jsonify, request, send_from_directory
import os

app = Flask(__name__, static_url_path='', static_folder='static')

@app.route('/')
def index():
    return app.send_static_file('index.html')

def create_tcp_handshake(sender_port, dest_port, start_step):
    return [
        {
            "step": start_step, "direction": "client_to_server",
            "app_layer": {"protocol": "TCP", "summary": "Establishing Connection...", "details": "Transport overhead."},
            "transport_layer": {"protocol": "TCP", "flags": ["SYN"], "seq": 0, "ack": 0, "win": 64240, "details": f"Source Port: {sender_port}\nDest Port: {dest_port}"}
        },
        {
            "step": start_step + 1, "direction": "server_to_client",
            "app_layer": {"protocol": "TCP", "summary": "Establishing Connection...", "details": "Transport overhead."},
            "transport_layer": {"protocol": "TCP", "flags": ["SYN", "ACK"], "seq": 0, "ack": 1, "win": 64240, "details": f"Source Port: {dest_port}\nDest Port: {sender_port}"}
        },
        {
            "step": start_step + 2, "direction": "client_to_server",
            "app_layer": {"protocol": "TCP", "summary": "Connection Established", "details": "Transport overhead."},
            "transport_layer": {"protocol": "TCP", "flags": ["ACK"], "seq": 1, "ack": 1, "win": 64240, "details": f"Source Port: {sender_port}\nDest Port: {dest_port}"}
        }
    ]

def create_tcp_teardown(sender_port, dest_port, start_step, seq_c, seq_s):
    return [
        {
            "step": start_step, "direction": "server_to_client",
            "app_layer": {"protocol": "TCP", "summary": "Closing Connection...", "details": "Transport overhead."},
            "transport_layer": {"protocol": "TCP", "flags": ["FIN", "ACK"], "seq": seq_s, "ack": seq_c, "win": 64240, "details": f"Source Port: {dest_port}\nDest Port: {sender_port}"}
        },
        {
            "step": start_step + 1, "direction": "client_to_server",
            "app_layer": {"protocol": "TCP", "summary": "Closing Connection...", "details": "Transport overhead."},
            "transport_layer": {"protocol": "TCP", "flags": ["ACK"], "seq": seq_c, "ack": seq_s + 1, "win": 64240, "details": f"Source Port: {sender_port}\nDest Port: {dest_port}"}
        },
        {
            "step": start_step + 2, "direction": "client_to_server",
            "app_layer": {"protocol": "TCP", "summary": "Closing Connection...", "details": "Transport overhead."},
            "transport_layer": {"protocol": "TCP", "flags": ["FIN", "ACK"], "seq": seq_c, "ack": seq_s + 1, "win": 64240, "details": f"Source Port: {sender_port}\nDest Port: {dest_port}"}
        },
        {
            "step": start_step + 3, "direction": "server_to_client",
            "app_layer": {"protocol": "TCP", "summary": "Connection Closed", "details": "Transport overhead."},
            "transport_layer": {"protocol": "TCP", "flags": ["ACK"], "seq": seq_s + 1, "ack": seq_c + 1, "win": 64240, "details": f"Source Port: {dest_port}\nDest Port: {sender_port}"}
        }
    ]

@app.route('/api/simulate/browsing', methods=['POST'])
def simulate_browsing():
    data = request.json
    url = data.get('url', 'example.com')
    domain = url.replace('http://', '').replace('https://', '').split('/')[0]
    
    sequence = [
        {
            "step": 1, "direction": "client_to_server", "sender": "Client", "receiver": "DNS Server",
            "app_layer": {"protocol": "DNS", "summary": f"DNS Query: {domain}", "details": f"Standard query A {domain}"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 53211\nDest Port: 53\nLength: 45"}
        },
        {
            "step": 2, "direction": "server_to_client", "sender": "DNS Server", "receiver": "Client",
            "app_layer": {"protocol": "DNS", "summary": f"DNS Response: {domain}", "details": f"Standard query response A 93.184.216.34"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 53\nDest Port: 53211\nLength: 61"}
        }
    ]
    
    # TCP Handshake
    sequence.extend([dict(s, sender="Client" if s['direction'] == 'client_to_server' else "Web Server", 
                          receiver="Web Server" if s['direction'] == 'client_to_server' else "Client") 
                    for s in create_tcp_handshake(54321, 80, 3)])
    
    # HTTP Data Transfer
    sequence.extend([
        {
            "step": 6, "direction": "client_to_server", "sender": "Client", "receiver": "Web Server",
            "app_layer": {"protocol": "HTTP", "summary": "HTTP GET", "details": f"GET / HTTP/1.1\nHost: {domain}\nAccept: text/html"},
            "transport_layer": {"protocol": "TCP", "flags": ["PSH", "ACK"], "seq": 1, "ack": 1, "win": 64240, "details": "Source Port: 54321\nDest Port: 80\nLength: 128"}
        },
        {
            "step": 7, "direction": "server_to_client", "sender": "Web Server", "receiver": "Client",
            "app_layer": {"protocol": "HTTP", "summary": "HTTP 200 OK", "details": f"HTTP/1.1 200 OK\nContent-Type: text/html\n\n<!doctype html><html>...</html>"},
            "transport_layer": {"protocol": "TCP", "flags": ["PSH", "ACK"], "seq": 1, "ack": 129, "win": 64240, "details": "Source Port: 80\nDest Port: 54321\nLength: 1024"}
        }
    ])
    
    # TCP Teardown
    sequence.extend([dict(s, sender="Client" if s['direction'] == 'client_to_server' else "Web Server", 
                          receiver="Web Server" if s['direction'] == 'client_to_server' else "Client") 
                    for s in create_tcp_teardown(54321, 80, 8, 129, 1025)])

    return jsonify(sequence)

@app.route('/api/simulate/mail', methods=['POST'])
def simulate_mail():
    data = request.json
    to_email = data.get('to', 'user@example.com')
    subject = data.get('subject', 'Hello')
    body = data.get('body', 'Test email')
    domain = to_email.split('@')[1] if '@' in to_email else 'example.com'
    
    sequence = [
        {
            "step": 1, "direction": "client_to_server", "sender": "Client", "receiver": "DNS Server",
            "app_layer": {"protocol": "DNS", "summary": f"DNS MX Query: {domain}", "details": f"Standard query MX {domain}"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 53211\nDest Port: 53\nLength: 45"}
        },
        {
            "step": 2, "direction": "server_to_client", "sender": "DNS Server", "receiver": "Client",
            "app_layer": {"protocol": "DNS", "summary": f"DNS MX Response", "details": f"MX 10 mail.{domain}"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 53\nDest Port: 53211\nLength: 61"}
        }
    ]
    
    sequence.extend([dict(s, sender="Client" if s['direction'] == 'client_to_server' else "SMTP Server", 
                          receiver="SMTP Server" if s['direction'] == 'client_to_server' else "Client") 
                    for s in create_tcp_handshake(55444, 25, 3)])
    
    smtp_steps = [
        ("EHLO", "EHLO client.local", "client_to_server"),
        ("250 OK", "250-mail.example.com Hello client.local", "server_to_client"),
        ("MAIL FROM", "MAIL FROM:<sender@local.com>", "client_to_server"),
        ("250 OK", "250 2.1.0 OK", "server_to_client"),
        ("RCPT TO", f"RCPT TO:<{to_email}>", "client_to_server"),
        ("250 OK", "250 2.1.5 OK", "server_to_client"),
        ("DATA", "DATA", "client_to_server"),
        ("354 Start mail input", "354 End data with <CR><LF>.<CR><LF>", "server_to_client"),
        ("Message Body", f"Subject: {subject}\n\n{body}\n.\n", "client_to_server"),
        ("250 OK", "250 2.0.0 Ok: queued", "server_to_client"),
        ("QUIT", "QUIT", "client_to_server"),
        ("221 Bye", "221 2.0.0 Bye", "server_to_client")
    ]
    
    c_seq, s_seq = 1, 1
    step_num = 6
    for summary, details, direction in smtp_steps:
        len_data = len(details)
        ack = s_seq if direction == "client_to_server" else c_seq
        seq = c_seq if direction == "client_to_server" else s_seq
        
        sequence.append({
            "step": step_num, "direction": direction,
            "sender": "Client" if direction == "client_to_server" else "SMTP Server",
            "receiver": "SMTP Server" if direction == "client_to_server" else "Client",
            "app_layer": {"protocol": "SMTP", "summary": summary, "details": details},
            "transport_layer": {"protocol": "TCP", "flags": ["PSH", "ACK"], "seq": seq, "ack": ack, "win": 64240, "details": f"Source Port: {55444 if direction == 'client_to_server' else 25}\nDest Port: {25 if direction == 'client_to_server' else 55444}\nLength: {len_data}"}
        })
        
        if direction == "client_to_server":
            c_seq += len_data
        else:
            s_seq += len_data
        step_num += 1

    sequence.extend([dict(s, sender="Client" if s['direction'] == 'client_to_server' else "SMTP Server", 
                          receiver="SMTP Server" if s['direction'] == 'client_to_server' else "Client") 
                    for s in create_tcp_teardown(55444, 25, step_num, c_seq, s_seq)])

    return jsonify(sequence)

@app.route('/api/simulate/streaming', methods=['POST'])
def simulate_streaming():
    data = request.json
    quality = data.get('quality', '1080p')
    
    sequence = [
        {
            "step": 1, "direction": "client_to_server", "sender": "Client", "receiver": "DNS Server",
            "app_layer": {"protocol": "DNS", "summary": "DNS Query: stream.server.com", "details": "Standard query A stream.server.com"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 53211\nDest Port: 53\nLength: 45"}
        },
        {
            "step": 2, "direction": "server_to_client", "sender": "DNS Server", "receiver": "Client",
            "app_layer": {"protocol": "DNS", "summary": "DNS Response", "details": "Standard query response A 203.0.113.5"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 53\nDest Port: 53211\nLength: 61"}
        },
        {
            "step": 3, "direction": "client_to_server", "sender": "Client", "receiver": "Streaming Server",
            "app_layer": {"protocol": "HTTP", "summary": "GET Manifest (via UDP)", "details": f"GET /playlist_{quality}.m3u8 HTTP/1.1\nHost: stream.server.com"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 60123\nDest Port: 8080\nLength: 90"}
        },
        {
            "step": 4, "direction": "server_to_client", "sender": "Streaming Server", "receiver": "Client",
            "app_layer": {"protocol": "HTTP", "summary": "200 OK (Manifest)", "details": "HTTP/1.1 200 OK\nContent-Type: application/vnd.apple.mpegurl\n\n#EXTM3U\n#EXTINF:4.000,\nsegment_1.ts"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 8080\nDest Port: 60123\nLength: 150"}
        },
        {
            "step": 5, "direction": "client_to_server", "sender": "Client", "receiver": "Streaming Server",
            "app_layer": {"protocol": "HTTP", "summary": "GET Segment 1", "details": "GET /segment_1.ts HTTP/1.1\nHost: stream.server.com"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 60123\nDest Port: 8080\nLength: 85"}
        },
        {
            "step": 6, "direction": "server_to_client", "sender": "Streaming Server", "receiver": "Client",
            "app_layer": {"protocol": "HTTP", "summary": "Video Data (Chunk 1)", "details": "[Binary Video Data...]"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 8080\nDest Port: 60123\nLength: 1400"}
        },
        {
            "step": 7, "direction": "server_to_client", "sender": "Streaming Server", "receiver": "Client",
            "app_layer": {"protocol": "HTTP", "summary": "Video Data (Chunk 2)", "details": "[Binary Video Data...]"},
            "transport_layer": {"protocol": "UDP", "flags": [], "seq": "-", "ack": "-", "win": "-", "details": "Source Port: 8080\nDest Port: 60123\nLength: 1400"}
        }
    ]
    return jsonify(sequence)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
