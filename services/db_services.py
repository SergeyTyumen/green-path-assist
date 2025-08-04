import sqlite3
from datetime import datetime

DATABASE = 'crm.db'

def get_db_connection():
    """Подключение к базе данных SQLite"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def get_dashboard_data():
    """Получает все данные, необходимые для страницы дашборда."""
    conn = get_db_connection()
    
    # 1. Получение общей статистики
    total_clients = conn.execute('SELECT COUNT(*) FROM clients').fetchone()[0]
    total_estimates_in_progress = conn.execute('SELECT COUNT(*) FROM estimates WHERE status IN ("draft", "sent")').fetchone()[0]
    total_proposals_sent = conn.execute('SELECT COUNT(*) FROM proposals WHERE status = "sent"').fetchone()[0]
    total_revenue_query = conn.execute('SELECT SUM(amount) FROM proposals WHERE status = "approved"').fetchone()[0]
    total_revenue = (total_revenue_query / 1000000) if total_revenue_query else 0
    
    # 2. Получение последних клиентов
    recent_clients_query = conn.execute('''
        SELECT c.*, 
               COUNT(cs.id) as total_stages,
               SUM(CASE WHEN cs.completed = 1 THEN 1 ELSE 0 END) as completed_stages
        FROM clients c
        LEFT JOIN client_stages cs ON c.id = cs.client_id
        GROUP BY c.id
        ORDER BY c.created_at DESC 
        LIMIT 4
    ''').fetchall()
    
    recent_clients = []
    for client in recent_clients_query:
        progress = client['completed_stages'] / client['total_stages'] if client['total_stages'] > 0 else 0
        status = 'new'
        if progress == 1:
            status = 'completed'
        elif progress > 0.7:
            status = 'in-progress'
        elif progress > 0.3:
            status = 'proposal-sent'
        elif progress > 0:
            status = 'call-scheduled'
        
        status_classes = {
            'new': 'bg-status-new/10 text-status-new',
            'call-scheduled': 'bg-status-call-scheduled/10 text-status-call-scheduled',
            'proposal-sent': 'bg-status-proposal-sent/10 text-status-proposal-sent',
            'in-progress': 'bg-status-in-progress/10 text-status-in-progress',
            'completed': 'bg-status-completed/10 text-status-completed'
        }
        status_labels = {
            'new': 'Новый', 'call-scheduled': 'Созвон', 'proposal-sent': 'КП отправлено',
            'in-progress': 'В работе', 'completed': 'Завершен'
        }
        
        recent_clients.append({
            'id': client['id'], 'name': client['name'], 'last_contact': client['last_contact'],
            'status_class': status_classes.get(status, ''), 'status_label': status_labels.get(status, '')
        })
        
    # 3. Получение задач на сегодня
    today_tasks_query = conn.execute('''
        SELECT * FROM tasks 
        WHERE status = 'pending' AND date(due_date) = date('now')
        ORDER BY 
            CASE priority 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
            END
        LIMIT 3
    ''').fetchall()

    today_tasks = []
    for task in today_tasks_query:
        priority = task['priority']
        priority_classes = {
            'high': 'bg-red-50 border-red-200', 'medium': 'bg-yellow-50 border-yellow-200',
            'low': 'bg-green-50 border-green-200'
        }
        text_classes = {
            'high': 'text-red-800', 'medium': 'text-yellow-800', 'low': 'text-green-800'
        }
        priority_text_classes = {
            'high': 'text-red-600', 'medium': 'text-yellow-600', 'low': 'text-green-600'
        }
        priority_labels = {'high': 'Высокий', 'medium': 'Средний', 'low': 'Низкий'}

        today_tasks.append({
            'id': task['id'], 'title': task['title'], 'category': task['category'],
            'priority_class': priority_classes.get(priority, ''),
            'text_class': text_classes.get(priority, ''),
            'priority_text_class': priority_text_classes.get(priority, ''),
            'priority_label': priority_labels.get(priority, '')
        })

    conn.close()

    return {
        'total_clients': total_clients,
        'total_estimates': total_estimates_in_progress,
        'total_proposals': total_proposals_sent,
        'total_revenue': round(total_revenue, 1),
        'recent_clients': recent_clients,
        'today_tasks': today_tasks
    }
