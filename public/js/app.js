document.addEventListener('DOMContentLoaded', () => {

    // --- API BASE URL ---
    // If running on the same host, we can use relative paths or explicit localhost.
    const API_URL = '/api';

    // Helper to format dates
    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('pt-BR');
    };

    // --- AUTHENTICATION LOGIC (index.html) ---
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    if (loginCard && registerCard) {
        // Toggle forms
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginCard.classList.add('hidden');
            registerCard.classList.remove('hidden');
        });

        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerCard.classList.add('hidden');
            loginCard.classList.remove('hidden');
        });

        // Registration Logic
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value.trim();
            const password = document.getElementById('register-password').value;
            const errorDiv = document.getElementById('register-error');

            if (!username || !password) {
                errorDiv.textContent = 'Preencha todos os campos.';
                return;
            }

            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        login: username, 
                        senha: password,
                        nome_completo: document.getElementById('register-name').value.trim()
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    // Log user in directly via localStorage ONLY for session keeping (token/id)
                    localStorage.setItem('podo_session', JSON.stringify({ id: data.id, login: data.login, nome_completo: data.nome_completo }));
                    window.location.href = 'dashboard.html';
                } else {
                    const errData = await response.json();
                    errorDiv.textContent = errData.detail || 'Erro ao registrar.';
                }
            } catch (error) {
                errorDiv.textContent = 'Erro de conexão com o servidor.';
            }
        });

        // Login Logic
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');

            if (!username || !password) {
                errorDiv.textContent = 'Preencha todos os campos.';
                return;
            }

            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: username, senha: password })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('podo_session', JSON.stringify({ id: data.id, login: data.login, nome_completo: data.nome_completo }));
                    window.location.href = 'dashboard.html';
                } else {
                    const errData = await response.json();
                    errorDiv.textContent = errData.detail || 'E-mail ou senha incorretos.';
                }
            } catch (error) {
                errorDiv.textContent = 'Erro de conexão com o servidor.';
            }
        });

        // Redirect if already logged in
        if (localStorage.getItem('podo_session')) {
            window.location.href = 'dashboard.html';
        }
    }


    // --- DASHBOARD LOGIC (dashboard.html) ---
    const dashboardHeader = document.querySelector('.app-header');
    if (dashboardHeader) {
        // Protect route
        const sessionStr = localStorage.getItem('podo_session');
        if (!sessionStr) {
            window.location.href = 'index.html';
            return;
        }

        const session = JSON.parse(sessionStr);

        // Set User Name
        document.getElementById('user-greeting').textContent = `Olá, ${session.nome_completo || session.login}`;

        // Logout logic
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('podo_session');
            window.location.href = 'index.html';
        });

        const clientForm = document.getElementById('add-client-form');
        const clientsSummaryTable = document.getElementById('clients-summary-table');
        const searchInput = document.getElementById('search-client');
        const calendarContainer = document.getElementById('calendar-container');
        const calendarMonthYear = document.getElementById('calendar-month-year');
        const dayList = document.getElementById('day-list');

        let allClients = []; // Global copy for searching and calendar

        // --- TAB LOGIC ---
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-tab');
                
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(target).classList.add('active');

                if (target === 'tab-clientes') {
                    loadClientsSummary();
                }
            });
        });

        // --- CALENDAR LOGIC ---
        const renderCalendar = (clients) => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();

            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            calendarMonthYear.textContent = `${monthNames[month]} ${year}`;

            calendarContainer.innerHTML = '';
            const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            daysOfWeek.forEach(d => {
                const el = document.createElement('div');
                el.className = 'calendar-day-header';
                el.textContent = d;
                calendarContainer.appendChild(el);
            });

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // Padding for first day
            for (let i = 0; i < firstDay; i++) {
                const el = document.createElement('div');
                el.className = 'calendar-day other-month';
                calendarContainer.appendChild(el);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const el = document.createElement('div');
                el.className = 'calendar-day';
                if (day === now.getDate()) el.classList.add('today');

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasConsults = clients.some(c => c.data_hora_consulta.startsWith(dateStr));
                if (hasConsults) el.classList.add('has-consultations');

                el.innerHTML = `<span>${day}</span>`;
                el.addEventListener('click', () => {
                    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                    el.classList.add('selected');
                    renderDayConsultations(dateStr, clients);
                });

                calendarContainer.appendChild(el);
            }
        };

        const renderDayConsultations = (dateStr, clients) => {
            const dayConsults = clients.filter(c => c.data_hora_consulta.startsWith(dateStr));
            dayList.innerHTML = '';

            if (dayConsults.length === 0) {
                dayList.innerHTML = '<div class="empty-state" style="padding: 1rem;"><p style="font-size: 0.85rem;">Nenhuma consulta para este dia.</p></div>';
                return;
            }

            dayConsults.forEach(c => {
                const time = new Date(c.data_hora_consulta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const item = document.createElement('div');
                item.className = 'client-card';
                item.style.padding = '1rem';
                item.innerHTML = `
                    <div style="font-weight: 600;">${time} - ${c.nome}</div>
                    <div style="font-size: 0.8rem; color: #666; margin-top: 5px;">${c.telefone} | ${c.anamnese}</div>
                `;
                dayList.appendChild(item);
            });
        };

        // --- CLIENT SUMMARY LOGIC ---
        const loadClientsSummary = async () => {
            try {
                const res = await fetch(`${API_URL}/clientes/resumo?admin_id=${session.id}`);
                if (res.ok) {
                    const resumo = await res.json();
                    renderClientsSummary(resumo);
                }
            } catch (e) {
                console.error("Erro ao carregar resumo", e);
            }
        };

        const renderClientsSummary = (resumo) => {
            clientsSummaryTable.innerHTML = '';
            resumo.forEach(c => {
                const lastDate = new Date(c.data_ultima_consulta).toLocaleDateString('pt-BR');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${c.nome}</strong></td>
                    <td>${c.telefone}</td>
                    <td>${c.email || '-'}</td>
                    <td style="font-size: 0.8rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.anamnese}</td>
                    <td>${lastDate}</td>
                    <td><span style="background: var(--primary-light); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem;">${c.total_consultas}</span></td>
                `;
                clientsSummaryTable.appendChild(row);
            });
        };

        // Load all clients for calendar
        const loadClients = async () => {
            try {
                const res = await fetch(`${API_URL}/clientes?admin_id=${session.id}`);
                if (res.ok) {
                    allClients = await res.json();
                    renderCalendar(allClients);
                }
            } catch (e) {
                console.error("Erro ao carregar clientes", e);
            }
        };

        // Save new client (API) + their first atendimento automatically if reason is provided
        clientForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('client-name').value.trim();
            const phone = document.getElementById('client-phone').value.trim();
            const email = document.getElementById('client-email').value.trim();
            const anamnese = document.getElementById('client-anamnese').value.trim();
            const dateTimeInput = document.getElementById('client-date-time').value;

            if (!name || !phone || !anamnese || !dateTimeInput) return;

            // 1. Validate time range (06h to 20h)
            const consultDate = new Date(dateTimeInput);
            const hour = consultDate.getHours();
            if (hour < 6 || hour >= 21) {
                alert("O horário da consulta deve estar entre as 06:00 e as 20:00.");
                return;
            }

            // 2. Automate booking date
            const dateBooked = new Date().toISOString().split('T')[0];

            try {
                const res = await fetch(`${API_URL}/clientes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        admin_id: session.id, 
                        nome: name,
                        telefone: phone,
                        email: email,
                        anamnese: anamnese,
                        data_agendamento: dateBooked,
                        data_hora_consulta: dateTimeInput
                    })
                });

                if (res.ok) {
                    clientForm.reset();
                    await loadClients();
                }
            } catch (err) {
                console.error("Erro ao registrar cliente", err);
                alert("Falha ao registrar cliente.");
            }
        });

        // Search client summary
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = clientsSummaryTable.querySelectorAll('tr');
            rows.forEach(row => {
                const name = row.cells[0].textContent.toLowerCase();
                row.style.display = name.includes(searchTerm) ? '' : 'none';
            });
        });

        // Initial fetch
        loadClients();
    }

});
