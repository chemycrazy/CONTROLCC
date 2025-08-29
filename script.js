document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNowLoTnadH8OVBDDM6UR56srmHSh63Gfm9OXYnDW37sBnNkeFvHMu14fD3qY8Xjg/exec"; // <-- ¡IMPORTANTE! Asegúrate que la URL de tu Web App es correcta.
    
    // --- ELEMENTOS DEL DOM ---
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    const activityForm = document.getElementById('activity-form');
    const formFieldset = document.getElementById('form-fieldset');
    const areaSelect = document.getElementById('area-select');
    const personalSelect = document.getElementById('personal-select');
    const dataError = document.getElementById('data-error');
    
    const tableViewBtn = document.getElementById('table-view-btn');
    const ganttViewBtn = document.getElementById('gantt-view-btn');
    const aboutBtn = document.getElementById('about-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const loader = document.getElementById('loader');
    
    // --- ESTADO DE LA APLICACIÓN ---
    let allActivities = [];
    let personalMap = {};
    let ganttChart = null;

    // --- FUNCIONES ---
    
    const showLoader = (show) => loader.classList.toggle('hidden', !show);

    const handleLogin = (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username === 'Calidad' && password === 'Calidad') {
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            loadInitialData();
        } else {
            loginError.textContent = 'Usuario o contraseña incorrectos.';
        }
    };

    /** Carga los datos iniciales y maneja los errores de forma visible */
       const loadInitialData = async () => {
    showLoader(true);
    dataError.textContent = '';
    formFieldset.disabled = true;

    try {
        // Añadimos { redirect: 'follow' } explícitamente.
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getInitialData' }),
            headers: { 'Content-Type': 'application/json' },
            redirect: 'follow' // Ayuda a manejar redirecciones de Google.
        });

        if (!response.ok) {
            // Si la respuesta no es OK, intentamos leerla como texto para ver el error.
            const errorText = await response.text();
            throw new Error(`Error de Red: ${response.status}. Respuesta: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.status === 'success' && result.data.personalMap) {
            personalMap = result.data.personalMap;
            allActivities = result.data.activities.map(row => ({
                area: row[0], personal: row[1], actividad: row[2],
                inicio: row[3], termino: row[4], dificultad: row[5], id: row[6]
            }));
            
            populateAreaDropdown();
            renderData();
            formFieldset.disabled = false;
        } else {
            // Si el JSON tiene status: 'error', usamos ese mensaje.
            throw new Error(result.message || "La estructura de datos recibida es incorrecta.");
        }
    } catch (error) {
        console.error('Error detallado al cargar datos:', error);
        dataError.textContent = `Error: ${error.message}`; // Mostramos el error real.
    } finally {
        showLoader(false);
    }
};     
    
    /** Llena el menú desplegable de Áreas. Ahora es más seguro. */
    const populateAreaDropdown = () => {
        const areas = Object.keys(personalMap);
        if (areas.length === 0) {
            areaSelect.innerHTML = '<option value="">-- No hay áreas disponibles --</option>';
            return;
        }

        areaSelect.innerHTML = '<option value="">-- Seleccione un Área --</option>';
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            areaSelect.appendChild(option);
        });
    };
    
    // El resto de las funciones (updatePersonalDropdown, formatDate, renderData, etc.) 
    // permanecen igual que en la versión anterior.
    // ... (incluye aquí el resto de funciones de tu script.js sin cambios) ...
    // ... (handleFormSubmit, switchView, exportToExcel, etc.) ...
     const updatePersonalDropdown = () => {
        const selectedArea = areaSelect.value;
        personalSelect.innerHTML = '<option value="">-- Seleccione Personal --</option>';
        if (selectedArea && personalMap[selectedArea]) {
            personalMap[selectedArea].forEach(person => {
                const option = document.createElement('option');
                option.value = person;
                option.textContent = person;
                personalSelect.appendChild(option);
            });
        }
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Ajustar por la zona horaria para evitar desfases de un día
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        const day = String(adjustedDate.getDate()).padStart(2, '0');
        const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
        const year = adjustedDate.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const renderData = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        const weeklyActivities = allActivities.filter(act => {
             const actStart = new Date(act.inicio);
             const actEnd = new Date(act.termino);
             return actStart <= endOfWeek && actEnd >= startOfWeek;
        });

        const tableBody = document.querySelector("#activities-table tbody");
        tableBody.innerHTML = '';
        weeklyActivities.forEach(act => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${act.area || ''}</td>
                <td>${act.personal || ''}</td>
                <td>${act.actividad || ''}</td>
                <td>${formatDate(act.inicio)}</td>
                <td>${formatDate(act.termino)}</td>
                <td>${act.dificultad || ''}</td>
                <td>${act.id || ''}</td>
            `;
        });
        
        const ganttTasks = weeklyActivities.map(act => ({
            id: String(act.id),
            name: act.actividad,
            start: act.inicio.split('T')[0],
            end: act.termino.split('T')[0],
            progress: 100,
            dependencies: '',
        }));
        
        document.getElementById('gantt-chart').innerHTML = '';
        
        if(ganttTasks.length > 0) {
            ganttChart = new Gantt("#gantt-chart", ganttTasks, {
                view_mode: 'Week', language: 'es'
            });
        }
    };
    
    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const newActivity = {
            area: areaSelect.value, personal: personalSelect.value,
            actividad: document.getElementById('actividad-input').value,
            inicio: document.getElementById('inicio-date').value,
            termino: document.getElementById('termino-date').value,
            dificultad: document.getElementById('dificultad-select').value,
        };
        
        showLoader(true);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'saveActivity', data: newActivity }),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                alert(result.data.message);
                activityForm.reset();
                personalSelect.innerHTML = '<option value="">-- Seleccione Personal --</option>';
                loadInitialData();
            } else { throw new Error(result.message); }
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('No se pudo guardar la actividad.');
        } finally {
            showLoader(false);
        }
    };
    
    const switchView = (view) => {
        document.getElementById('table-view').classList.toggle('hidden', view !== 'table');
        document.getElementById('gantt-view').classList.toggle('hidden', view !== 'gantt');
        tableViewBtn.classList.toggle('active', view === 'table');
        ganttViewBtn.classList.toggle('active', view === 'gantt');
    };
    
    const exportToExcel = () => {
        const table = document.getElementById('activities-table');
        const wb = XLSX.utils.table_to_book(table, { sheet: "Actividades" });
        XLSX.writeFile(wb, "Reporte_Actividades_Calidad.xlsx");
    };
    
    const aboutModal = document.getElementById('about-modal');
    const closeModalBtn = document.querySelector('.close-button');

    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    areaSelect.addEventListener('change', updatePersonalDropdown);
    activityForm.addEventListener('submit', handleFormSubmit);
    tableViewBtn.addEventListener('click', () => switchView('table'));
    ganttViewBtn.addEventListener('click', () => switchView('gantt'));
    aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => aboutModal.classList.add('hidden'));
    window.addEventListener('click', (event) => {
        if (event.target === aboutModal) aboutModal.classList.add('hidden');
    });
    exportExcelBtn.addEventListener('click', exportToExcel);
});
