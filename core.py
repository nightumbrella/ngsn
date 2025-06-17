import tkinter as tk
from tkinter import ttk
import psutil
import socket
import threading
import time
from collections import defaultdict
from datetime import datetime
import subprocess
import re

class NetworkTrafficMonitor:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Network Traffic Monitor - Trafik Kuzatuvchi")
        self.root.geometry("900x650")
        self.root.configure(bg='#2c3e50')
        
        # Traffic data storage
        self.traffic_data = defaultdict(lambda: {'sent': 0, 'recv': 0, 'connections': 0})
        self.domain_cache = {}
        self.is_monitoring = False
        self.monitor_thread = None
        
        # Previous network stats for calculating differences
        self.prev_net_io = psutil.net_io_counters()
        self.connection_history = defaultdict(int)
        
        self.setup_ui()
        self.start_monitoring()
    
    def setup_ui(self):
        # Main frame
        main_frame = tk.Frame(self.root, bg='#2c3e50')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Title
        title_label = tk.Label(main_frame, text="Network Traffic Monitor - Trafik Kuzatuvchi", 
                              font=('Arial', 16, 'bold'), fg='#ecf0f1', bg='#2c3e50')
        title_label.pack(pady=(0, 20))
        
        # Control buttons frame
        control_frame = tk.Frame(main_frame, bg='#2c3e50')
        control_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Start/Stop button
        self.control_btn = tk.Button(control_frame, text="Kuzatishni To'xtatish", 
                                   command=self.toggle_monitoring,
                                   bg='#e74c3c', fg='white', font=('Arial', 10, 'bold'),
                                   padx=20, pady=5)
        self.control_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        # Clear button
        clear_btn = tk.Button(control_frame, text="Ma'lumotlarni Tozalash", 
                            command=self.clear_data,
                            bg='#f39c12', fg='white', font=('Arial', 10, 'bold'),
                            padx=20, pady=5)
        clear_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        # Manual refresh button
        refresh_btn = tk.Button(control_frame, text="Yangilash", 
                              command=self.manual_refresh,
                              bg='#27ae60', fg='white', font=('Arial', 10, 'bold'),
                              padx=20, pady=5)
        refresh_btn.pack(side=tk.LEFT)
        
        # Status label
        self.status_label = tk.Label(main_frame, text="Holat: Kuzatuv Faol", 
                                   fg='#2ecc71', bg='#2c3e50', font=('Arial', 10))
        self.status_label.pack(anchor=tk.W, pady=(0, 10))
        
        # Info label
        info_label = tk.Label(main_frame, text="Bu dastur haqiqiy tarmoq ulanishlarini kuzatadi va website nomlarini aniqlaydi", 
                            fg='#95a5a6', bg='#2c3e50', font=('Arial', 9))
        info_label.pack(anchor=tk.W, pady=(0, 10))
        
        # Treeview for displaying traffic data
        columns = ('Website/IP', 'Ulanishlar', 'Port', 'Holat', 'Vaqt')
        self.tree = ttk.Treeview(main_frame, columns=columns, show='headings', height=18)
        
        # Configure column headings and widths
        self.tree.heading('Website/IP', text='Website/IP Manzil')
        self.tree.heading('Ulanishlar', text='Ulanishlar')
        self.tree.heading('Port', text='Port')
        self.tree.heading('Holat', text='Holat')
        self.tree.heading('Vaqt', text='Oxirgi Faollik')
        
        self.tree.column('Website/IP', width=300)
        self.tree.column('Ulanishlar', width=100)
        self.tree.column('Port', width=80)
        self.tree.column('Holat', width=120)
        self.tree.column('Vaqt', width=120)
        
        # Scrollbar for treeview
        scrollbar = ttk.Scrollbar(main_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack treeview and scrollbar
        tree_frame = tk.Frame(main_frame)
        tree_frame.pack(fill=tk.BOTH, expand=True)
        
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Configure treeview style
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('Treeview', background='#34495e', foreground='#ecf0f1', fieldbackground='#34495e')
        style.configure('Treeview.Heading', background='#2c3e50', foreground='#ecf0f1')
        
        # Connection summary
        summary_frame = tk.Frame(main_frame, bg='#2c3e50')
        summary_frame.pack(fill=tk.X, pady=(10, 0))
        
        self.summary_label = tk.Label(summary_frame, text="Jami faol ulanishlar: 0", 
                                    fg='#3498db', bg='#2c3e50', font=('Arial', 10, 'bold'))
        self.summary_label.pack()
    
    def resolve_domain(self, ip):
        """IP manzilni domain nomiga aylantirish"""
        if ip in self.domain_cache:
            return self.domain_cache[ip]
        
        try:
            # Reverse DNS lookup
            domain = socket.gethostbyaddr(ip)[0]
            
            # Clean domain name
            if domain.startswith('www.'):
                domain = domain[4:]
            
            # Extract main domain
            parts = domain.split('.')
            if len(parts) >= 2:
                domain = '.'.join(parts[-2:])
            
            self.domain_cache[ip] = domain
            return domain
            
        except (socket.herror, socket.gaierror):
            # Try to identify known services by IP range
            if ip.startswith(('142.250.', '172.217.', '216.58.')):
                domain = 'google.com'
            elif ip.startswith(('157.240.', '31.13.', '69.171.')):
                domain = 'facebook.com'
            elif ip.startswith(('151.101.', '199.232.')):
                domain = 'reddit.com'
            elif ip.startswith('104.244.'):
                domain = 'twitter.com'
            elif ip.startswith(('13.', '52.', '54.', '18.')):
                domain = 'amazonaws.com'
            elif ip.startswith('185.199.'):
                domain = 'github.com'
            else:
                domain = ip
            
            self.domain_cache[ip] = domain
            return domain
    
    def get_network_connections(self):
        """Faol tarmoq ulanishlarini olish"""
        connections_data = []
        
        try:
            connections = psutil.net_connections(kind='inet')
            
            for conn in connections:
                if conn.raddr and conn.status == psutil.CONN_ESTABLISHED:
                    remote_ip = conn.raddr.ip
                    remote_port = conn.raddr.port
                    
                    # Local IP larni skip qilish
                    if (remote_ip.startswith(('127.', '192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.')) or
                        remote_ip.startswith(tuple(f'172.{i}.' for i in range(16, 32)))):
                        continue
                    
                    # Domain nomini aniqlash
                    domain = self.resolve_domain(remote_ip)
                    
                    # Ulanish ma'lumotlarini saqlash
                    connection_key = f"{domain}:{remote_port}"
                    self.connection_history[connection_key] += 1
                    
                    connections_data.append({
                        'domain': domain,
                        'ip': remote_ip,
                        'port': remote_port,
                        'status': conn.status,
                        'count': self.connection_history[connection_key],
                        'time': datetime.now().strftime("%H:%M:%S")
                    })
                    
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            pass
        
        return connections_data
    
    def monitor_network(self):
        """Tarmoq faoliyatini kuzatish"""
        while self.is_monitoring:
            try:
                # Faol ulanishlarni olish
                connections = self.get_network_connections()
                
                # Ma'lumotlarni yangilash
                current_domains = set()
                for conn in connections:
                    domain = conn['domain']
                    current_domains.add(domain)
                    
                    if domain not in self.traffic_data:
                        self.traffic_data[domain] = {
                            'connections': 0,
                            'ports': set(),
                            'last_seen': conn['time'],
                            'ip': conn['ip']
                        }
                    
                    self.traffic_data[domain]['connections'] = conn['count']
                    self.traffic_data[domain]['ports'].add(conn['port'])
                    self.traffic_data[domain]['last_seen'] = conn['time']
                    self.traffic_data[domain]['status'] = conn['status']
                
                time.sleep(2)  # 2 soniyada bir yangilash
                
            except Exception as e:
                print(f"Monitoring xatosi: {e}")
                time.sleep(5)
    
    def update_display(self):
        """Displeyni yangilash"""
        if not self.is_monitoring:
            return
        
        # Jadval ma'lumotlarini tozalash
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Hozirgi ulanishlarni olish
        current_connections = self.get_network_connections()
        
        # Domain bo'yicha guruhlash
        domain_stats = defaultdict(lambda: {'count': 0, 'ports': set(), 'ips': set(), 'last_time': ''})
        
        for conn in current_connections:
            domain = conn['domain']
            domain_stats[domain]['count'] += 1
            domain_stats[domain]['ports'].add(str(conn['port']))
            domain_stats[domain]['ips'].add(conn['ip'])
            domain_stats[domain]['last_time'] = conn['time']
        
        # Ma'lumotlarni jadvga qo'shish
        total_connections = 0
        for domain, stats in sorted(domain_stats.items(), key=lambda x: x[1]['count'], reverse=True):
            ports_str = ', '.join(sorted(stats['ports'])[:3])  # Eng ko'p 3 ta port ko'rsatish
            if len(stats['ports']) > 3:
                ports_str += f" (+{len(stats['ports'])-3})"
            
            display_name = domain
            if domain != list(stats['ips'])[0]:  # Agar domain IP ga teng bo'lmasa
                display_name = f"{domain} ({list(stats['ips'])[0]})"
            
            self.tree.insert('', tk.END, values=(
                display_name,
                stats['count'],
                ports_str,
                'ESTABLISHED',
                stats['last_time']
            ))
            
            total_connections += stats['count']
        
        # Umumiy statistikani yangilash
        self.summary_label.config(text=f"Jami faol ulanishlar: {total_connections} | "
                                      f"Noyob domenlar: {len(domain_stats)}")
        
        # Keyingi yangilanishni rejalashtirish
        if self.is_monitoring:
            self.root.after(3000, self.update_display)
    
    def manual_refresh(self):
        """Qo'lda yangilash"""
        self.update_display()
    
    def toggle_monitoring(self):
        """Kuzatishni yoqish/o'chirish"""
        if self.is_monitoring:
            self.stop_monitoring()
        else:
            self.start_monitoring()
    
    def start_monitoring(self):
        """Kuzatishni boshlash"""
        if not self.is_monitoring:
            self.is_monitoring = True
            self.monitor_thread = threading.Thread(target=self.monitor_network, daemon=True)
            self.monitor_thread.start()
            
            self.control_btn.config(text="Kuzatishni To'xtatish", bg='#e74c3c')
            self.status_label.config(text="Holat: Kuzatuv Faol", fg='#2ecc71')
            
            # Displey yangilanishini boshlash
            self.update_display()
    
    def stop_monitoring(self):
        """Kuzatishni to'xtatish"""
        self.is_monitoring = False
        
        self.control_btn.config(text="Kuzatishni Boshlash", bg='#27ae60')
        self.status_label.config(text="Holat: Kuzatuv To'xtatilgan", fg='#e74c3c')
    
    def clear_data(self):
        """Barcha ma'lumotlarni tozalash"""
        self.traffic_data.clear()
        self.domain_cache.clear()
        self.connection_history.clear()
        
        # Jadvalni tozalash
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        self.summary_label.config(text="Jami faol ulanishlar: 0")
    
    def on_closing(self):
        """Dasturni yopish"""
        self.stop_monitoring()
        self.root.destroy()
    
    def run(self):
        """Dasturni ishga tushirish"""
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.root.mainloop()

if __name__ == "__main__":
    try:
        print("Network Traffic Monitor ishga tushmoqda...")
        print("Administrator huquqlari kerak bo'lishi mumkin!")
        
        app = NetworkTrafficMonitor()
        app.run()
        
    except Exception as e:
        print(f"Xatolik: {e}")
        print("Dasturni administrator sifatida ishga tushiring!")
        input("Enter tugmasini bosing...")