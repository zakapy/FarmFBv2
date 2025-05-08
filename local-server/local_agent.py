import os
import uuid
import platform
import json
import getmac
import subprocess
import threading
import time
import sys
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from urllib.parse import parse_qs, urlparse
import socket
import io

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("local_agent.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("local_agent")

# Константы
TOKEN_FILE = "token.secret"
KEY_FILE = "key.secret"
VERSION = "1.0.2"
DEFAULT_PORT = 8843

# Встроенный HTML для случая, когда index.html не найден
EMBEDDED_HTML = """<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Nuvio Agent</title>
    <style>
        body {
            font-family: 'Segoe UI', sans-serif;
            background-color: #0d1117;
            color: #c9d1d9;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            background-color: #161b22;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
            max-width: 600px;
        }
        h1 {
            font-size: 28px;
            margin-bottom: 20px;
            color: #58a6ff;
        }
        .token-box {
            background-color: #0e4429;
            color: #39d353;
            font-family: monospace;
            padding: 10px;
            border-radius: 6px;
            margin: 20px 0;
            word-break: break-all;
            font-size: 16px;
        }
        .status {
            padding: 10px;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 14px;
        }
        .status.connected {
            background-color: #0e4429;
            color: #39d353;
        }
        .status.disconnected {
            background-color: #3b1113;
            color: #f85149;
        }
        small {
            color: #8b949e;
            display: block;
            margin-top: 10px;
        }
        .version {
            position: absolute;
            bottom: 10px;
            right: 10px;
            font-size: 12px;
            color: #8b949e;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Добро пожаловать в <strong>Nuvio</strong></h1>
        <p>Ваш локальный агент успешно запущен.</p>
        <p>Скопируйте токен ниже и вставьте его в личный кабинет.</p>
        <div class="token-box">{{TOKEN}}</div>
        <div id="status" class="status">Проверка соединения...</div>
        <small>Это уникальный токен привязанный к вашему устройству.</small>
        <small>Пожалуйста, не закрывайте это окно пока работаете с системой.</small>
    </div>
    <div class="version">v1.0.2</div>

    <script>
        // Проверка статуса соединения
        function checkConnection() {
            const statusEl = document.getElementById('status');
            statusEl.textContent = 'Проверка соединения...';
            statusEl.className = 'status';
            
            fetch('/ping', { 
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ok') {
                    statusEl.textContent = `Соединение активно (${data.system})`;
                    statusEl.className = 'status connected';
                } else {
                    throw new Error('Неверный статус');
                }
            })
            .catch(error => {
                statusEl.textContent = 'Соединение потеряно';
                statusEl.className = 'status disconnected';
                console.error('Ошибка проверки соединения:', error);
            });
        }
        
        // Проверяем соединение каждые 5 секунд
        checkConnection();
        setInterval(checkConnection, 5000);
    </script>
</body>
</html>"""

class CommandHandler:
    """Обработчик команд от основного приложения"""
    
    @staticmethod
    def execute_command(command_data, token):
        """
        Выполнить полученную команду
        
        Args:
            command_data (dict): Данные команды
            token (str): Токен авторизации
            
        Returns:
            dict: Результат выполнения команды
        """
        try:
            # Здесь будет логика обработки разных команд
            command_type = command_data.get("type", "unknown")
            
            if command_type == "ping":
                return {"status": "ok", "version": VERSION}
                
            elif command_type == "get_system_info":
                return {
                    "status": "ok",
                    "system": platform.system(),
                    "release": platform.release(),
                    "version": platform.version(),
                    "machine": platform.machine(),
                    "processor": platform.processor()
                }
            
            elif command_type == "execute_command":
                cmd = command_data.get("command")
                if not cmd:
                    return {"status": "error", "message": "Команда не указана"}
                
                try:
                    # Безопасное выполнение команды с ограничениями
                    if platform.system() == "Windows":
                        result = subprocess.check_output(cmd, shell=True, timeout=30, stderr=subprocess.STDOUT).decode('utf-8', errors='replace')
                    else:
                        result = subprocess.check_output(cmd, shell=True, timeout=30, stderr=subprocess.STDOUT).decode('utf-8', errors='replace')
                    return {"status": "ok", "result": result}
                except subprocess.CalledProcessError as e:
                    return {"status": "error", "message": e.output.decode('utf-8', errors='replace')}
                except subprocess.TimeoutExpired:
                    return {"status": "error", "message": "Превышено время выполнения команды"}
                
            # Другие команды будут добавлены по мере необходимости
            
            return {"status": "error", "message": f"Неизвестная команда: {command_type}"}
            
        except Exception as e:
            logger.error(f"Ошибка при выполнении команды: {str(e)}")
            return {"status": "error", "message": str(e)}

def generate_token():
    """
    Генерирует или считывает существующий токен
    
    Returns:
        str: Токен для авторизации
    """
    if Path(TOKEN_FILE).exists():
        cipher = get_cipher()
        encrypted = Path(TOKEN_FILE).read_bytes()
        try:
            return cipher.decrypt(encrypted).decode()
        except Exception as e:
            logger.error(f"Ошибка при расшифровке токена: {str(e)}")
            # Если не удалось расшифровать, создаем новый
            os.remove(TOKEN_FILE)
            return generate_token()

    # Генерация нового токена
    logger.info("Генерация нового токена...")
    raw = f"{uuid.uuid4()}-{platform.node()}-{getmac.get_mac_address()}"
    digest = hashes.Hash(hashes.SHA256())
    digest.update(raw.encode())
    token_hash = digest.finalize()
    token = base64.b64encode(token_hash).decode("utf-8")[:32]

    # Сохраняем токен в зашифрованном виде
    cipher = get_cipher()
    encrypted = cipher.encrypt(token.encode())
    Path(TOKEN_FILE).write_bytes(encrypted)
    logger.info(f"Токен сгенерирован: {token}")
    return token

def get_cipher():
    """
    Создает или получает ключ шифрования на основе особенностей устройства
    
    Returns:
        Fernet: Объект шифрования
    """
    if Path(KEY_FILE).exists():
        try:
            key = Path(KEY_FILE).read_bytes()
            return Fernet(key)
        except Exception as e:
            logger.error(f"Ошибка при чтении ключа: {str(e)}")
            os.remove(KEY_FILE)
    
    # Создание ключа на основе особенностей устройства
    salt = f"{platform.node()}-{getmac.get_mac_address()}".encode()
    digest = hashes.Hash(hashes.SHA256())
    digest.update(salt)
    final_salt = digest.finalize()

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=final_salt,
        iterations=100000,
    )
    
    key = base64.urlsafe_b64encode(kdf.derive(uuid.getnode().to_bytes(8, "big")))
    Path(KEY_FILE).write_bytes(key)
    return Fernet(key)

class AgentHandler(BaseHTTPRequestHandler):
    """Обработчик HTTP-запросов с улучшенной обработкой CORS и ошибок соединения"""
    
    # Увеличиваем таймаут для предотвращения разрыва соединения
    timeout = 60
    
    def __init__(self, *args, **kwargs):
        # Улучшение логирования
        self.client_address_str = None
        super().__init__(*args, **kwargs)
        
    def setup(self):
        """Начальная настройка соединения"""
        super().setup()
        self.client_address_str = f"{self.client_address[0]}:{self.client_address[1]}"
        
    def log_message(self, format, *args):
        """Перехват логирования запросов"""
        logger.info(f"{self.client_address_str} - {format % args}")

    def add_cors_headers(self):
        """Добавление CORS-заголовков для разрешения кросс-доменных запросов"""
        # Критичные заголовки для предотвращения CORS ошибок
        origin = self.headers.get('Origin', '*')
        
        # Разрешаем запросы со всех доменов для локальной разработки
        self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Cache-Control, Pragma')
        self.send_header('Access-Control-Max-Age', '86400')  # 24 часа
        self.send_header('Access-Control-Allow-Credentials', 'true')
        
        # Заголовки для предотвращения кэширования
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
    def do_OPTIONS(self):
        """Обработка preflight-запросов для CORS"""
        self.send_response(200)
        self.add_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        """Обработка GET-запросов"""
        try:
            parsed_path = urlparse(self.path)
            
            # Обработка главной страницы с токеном
            if parsed_path.path == "/":
                token = self.server.token

                # Получаем содержимое HTML страницы
                content = self.get_html_content().replace("{{TOKEN}}", token)
                
                self.send_response(200)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.add_cors_headers()
                self.end_headers()
                
                try:
                    self.wfile.write(content.encode("utf-8"))
                except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError) as e:
                    logger.warning(f"Соединение разорвано при отправке HTML: {str(e)}")
                
            # Эндпоинт для проверки подключения
            elif parsed_path.path == "/ping":
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.add_cors_headers()
                self.end_headers()
                
                try:
                    response = json.dumps({
                        "status": "ok", 
                        "version": VERSION,
                        "system": platform.system(),
                        "hostname": platform.node(),
                        "time": time.time()  # Добавляем метку времени для предотвращения кэширования
                    })
                    self.wfile.write(response.encode("utf-8"))
                except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError) as e:
                    # Игнорируем ошибки разорванного соединения
                    logger.warning(f"Соединение разорвано при отправке ping: {str(e)}")
                    
            else:
                self.send_response(404)
                self.add_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Эндпоинт не найден"}).encode("utf-8"))

        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError) as e:
            logger.warning(f"Соединение разорвано во время обработки запроса: {str(e)}")
        except Exception as e:
            logger.error(f"Ошибка при обработке GET-запроса: {str(e)}")
            try:
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.add_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Внутренняя ошибка сервера"}).encode("utf-8"))
            except:
                # Игнорируем ошибки, если не можем отправить ответ
                pass
    
    def get_html_content(self):
        """Получает содержимое HTML страницы"""
        try:
            # Сначала ищем файл в текущем каталоге
            current_dir = Path.cwd()
            html_path = current_dir / "index.html"
            
            if html_path.exists():
                return html_path.read_text(encoding="utf-8")
            
            # Затем проверяем каталог со скриптом
            script_dir = Path(__file__).parent
            html_path = script_dir / "index.html"
            
            if html_path.exists():
                return html_path.read_text(encoding="utf-8")
            
            # В случае запуска из замороженного приложения
            if getattr(sys, 'frozen', False):
                base_path = Path(sys._MEIPASS)
                html_path = base_path / "index.html"
                if html_path.exists():
                    return html_path.read_text(encoding="utf-8")
            
            # Если файл не найден, используем встроенный HTML
            logger.warning("index.html не найден, используем встроенный шаблон")
            return EMBEDDED_HTML
        
        except Exception as e:
            logger.error(f"Ошибка при получении HTML: {str(e)}")
            return EMBEDDED_HTML

    def do_POST(self):
        """Обработка POST-запросов"""
        try:
            parsed_path = urlparse(self.path)
            
            # Эндпоинт для выполнения команд
            if parsed_path.path == "/api/command":
                # Проверка авторизации
                auth_header = self.headers.get('Authorization')
                if not auth_header or not auth_header.startswith('Bearer '):
                    self.send_response(401)
                    self.send_header("Content-type", "application/json")
                    self.add_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Требуется авторизация"}).encode("utf-8"))
                    return
                
                # Извлечение и проверка токена
                token = auth_header.split(' ')[1]
                if token != self.server.token:
                    self.send_response(403)
                    self.send_header("Content-type", "application/json")
                    self.add_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Неверный токен"}).encode("utf-8"))
                    return
                
                # Чтение данных запроса
                content_length = int(self.headers.get('Content-Length', 0))
                raw_data = self.rfile.read(content_length)
                
                try:
                    # Преобразуем байты в JSON
                    data = json.loads(raw_data.decode('utf-8'))
                    
                    # Выполнение команды
                    result = CommandHandler.execute_command(data, token)
                    
                    # Отправка результата
                    self.send_response(200)
                    self.send_header("Content-type", "application/json")
                    self.add_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode("utf-8"))
                    
                except json.JSONDecodeError:
                    self.send_response(400)
                    self.send_header("Content-type", "application/json")
                    self.add_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Неверный формат JSON"}).encode("utf-8"))
                    
                except Exception as e:
                    logger.error(f"Ошибка при обработке запроса: {str(e)}")
                    self.send_response(500)
                    self.send_header("Content-type", "application/json")
                    self.add_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Внутренняя ошибка сервера"}).encode("utf-8"))
            
            else:
                self.send_response(404)
                self.add_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Эндпоинт не найден"}).encode("utf-8"))
                
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError) as e:
            logger.warning(f"Соединение разорвано во время обработки запроса: {str(e)}")
        except Exception as e:
            logger.error(f"Ошибка при обработке POST-запроса: {str(e)}")
            try:
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.add_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Внутренняя ошибка сервера"}).encode("utf-8"))
            except:
                # Игнорируем ошибки, если не можем отправить ответ
                pass

class ThreadedHTTPServer(HTTPServer):
    """Многопоточный HTTP сервер с улучшенной обработкой ошибок"""
    
    def handle_error(self, request, client_address):
        """Переопределение метода обработки ошибок для более чистого логирования"""
        exc_type, exc_value, _ = sys.exc_info()
        if exc_type in (socket.error, ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            logger.warning(f"Сетевая ошибка при обработке запроса от {client_address}: {exc_value}")
        else:
            logger.error(f"Ошибка при обработке запроса от {client_address}: {exc_type.__name__}: {exc_value}")
                
def open_browser(url):
    """Открывает браузер с указанным URL через 1 секунду после запуска"""
    time.sleep(1)
    try:
        # Разные команды для разных ОС
        if platform.system() == 'Windows':
            subprocess.Popen(["start", url], shell=True)
        elif platform.system() == 'Darwin':  # macOS
            subprocess.Popen(["open", url])
        else:  # Linux и другие
            subprocess.Popen(["xdg-open", url])
        logger.info(f"Браузер открыт: {url}")
    except Exception as e:
        logger.error(f"Ошибка при открытии браузера: {str(e)}")

def main():
    """Основная функция запуска сервера"""
    logger.info(f"Запуск локального агента версии {VERSION}")
    
    # Генерация или получение существующего токена
    token = generate_token()
    
    # Пробуем запустить на основном порту, если занят - ищем свободный
    port = DEFAULT_PORT
    max_port = DEFAULT_PORT + 50
    
    while port < max_port:
        try:
            # Используем '' вместо 'localhost' для прослушивания на всех интерфейсах
            server_address = ('', port)
            httpd = ThreadedHTTPServer(server_address, AgentHandler)
            
            # Устанавливаем опции сокета для лучшей обработки соединений
            httpd.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            
            # Сохраняем токен в сервере
            httpd.token = token
            
            # Улучшенное логирование сервера
            logger.info(f"Сервер запущен на http://localhost:{port}")
            logger.info(f"Токен авторизации: {token}")
            
            # Открытие браузера в отдельном потоке
            threading.Thread(target=open_browser, args=(f"http://localhost:{port}",), daemon=True).start()
            
            # Запускаем сервер в отдельном потоке для возможного мягкого перезапуска
            server_thread = threading.Thread(target=httpd.serve_forever)
            server_thread.daemon = True
            server_thread.start()
            
            # Основной цикл для обеспечения работы программы
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("Завершение работы по запросу пользователя")
                httpd.shutdown()
                
            break
            
        except OSError as e:
            logger.warning(f"Порт {port} занят: {str(e)}")
            port += 1
            
    if port >= max_port:
        logger.error(f"Не удалось найти свободный порт в диапазоне {DEFAULT_PORT}-{max_port-1}")
        print(f"ОШИБКА: Не удалось найти свободный порт")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Завершение работы по запросу пользователя")
    except Exception as e:
        logger.critical(f"Критическая ошибка: {str(e)}")
        sys.exit(1)