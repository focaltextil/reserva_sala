document.addEventListener('DOMContentLoaded', function () {

    const btn_agendar = document.getElementById("btn_agendar");

    document.getElementById('data').addEventListener('change', function () {
        const dataFiltro = this.value;

        fetch("https://api-tbpreco.onrender.com/horarios")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro na resposta. Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(data);

                horariosOcupados = {};


                data.forEach(reserva => {
                    const { sala, data: dataReserva, hora_inicio, hora_fim, nome } = reserva;


                    const dataReservaFormatada = new Date(dataReserva).toISOString().split('T')[0];

                    if (dataReservaFormatada === dataFiltro) {
                        if (!horariosOcupados[sala]) {
                            horariosOcupados[sala] = {};
                        }
                        if (!horariosOcupados[sala][dataFiltro]) {
                            horariosOcupados[sala][dataFiltro] = [];
                        }

                        horariosOcupados[sala][dataFiltro].push({ nome, inicio: hora_inicio, fim: hora_fim });
                    }
                });


                atualizarListaOcupados();
                atualizarHorarios();
            })
            .catch(error => {
                console.error("Erro ao buscar horários:", error);
                alert("Erro ao buscar horários. Verifique a API ou a sua conexão.");
            });
    });

    // ---------------------------------------------------------------------------------------------------------

    let horariosOcupados = {
        "Sala De Reunião": {},
        "Sala De Treinamento": {}
    };

    function gerarHorariosDisponiveis() {
        const horarios = [];
        let hora = 7;
        let minuto = 0;

        while (hora < 18) {
            horarios.push(`${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`);
            minuto = minuto === 0 ? 30 : 0;
            if (minuto === 0) hora++;
        }
        return horarios;
    }

    function atualizarHorarios() {
        const dataEscolhida = document.getElementById('data').value;
        const salaEscolhida = document.getElementById('sala').value;
        const horaInicioSelect = document.getElementById('hora-inicio');
        const horaFimSelect = document.getElementById('hora-fim');

        if (!dataEscolhida || !salaEscolhida) return;

        horaInicioSelect.innerHTML = '';
        horaFimSelect.innerHTML = '';

        if (!horariosOcupados[salaEscolhida]) {
            horariosOcupados[salaEscolhida] = {};
        }
        if (!horariosOcupados[salaEscolhida][dataEscolhida]) {
            horariosOcupados[salaEscolhida][dataEscolhida] = [];
        }

        let horariosRestantes = gerarHorariosDisponiveis();

        // Apenas filtra se houver reservas no dia
        if (horariosOcupados[salaEscolhida][dataEscolhida].length > 0) {
            horariosRestantes = horariosRestantes.filter(horario => {
                return !horariosOcupados[salaEscolhida][dataEscolhida].some(intervalo =>
                    !(intervalo.fim <= horario || intervalo.inicio >= horario)
                );
            });
        }

        // Garante que a lista tenha pelo menos os horários padrões disponíveis
        if (horariosRestantes.length === 0) {
            horariosRestantes = gerarHorariosDisponiveis();
        }

        horariosRestantes.forEach(horario => {
            const optionInicio = document.createElement('option');
            optionInicio.value = horario;
            optionInicio.textContent = horario;
            horaInicioSelect.appendChild(optionInicio);

            const optionFim = document.createElement('option');
            optionFim.value = horario;
            optionFim.textContent = horario;
            horaFimSelect.appendChild(optionFim);
        });
    }


    function atualizarListaOcupados() {
        const lista = document.getElementById('lista-horarios');
        lista.innerHTML = '';

        for (let sala in horariosOcupados) {
            for (let data in horariosOcupados[sala]) {
                horariosOcupados[sala][data].forEach(intervalo => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${intervalo.nome}</strong> reservou <strong>${sala}</strong> das ${intervalo.inicio} até ${intervalo.fim} (${data})`;
                    lista.appendChild(li);
                });
            }
        }
    }


    // ---------------------------------------------------------------------------------------------------------


    btn_agendar.addEventListener("click", function () {
        const nome = document.getElementById('nome').value.trim();
        const salaEscolhida = document.getElementById('sala').value;
        const dataEscolhida = document.getElementById('data').value;
        const horaInicio = document.getElementById('hora-inicio').value;
        const horaFim = document.getElementById('hora-fim').value;

        // Verifica se todos os campos foram preenchidos
        if (!nome || !salaEscolhida || !dataEscolhida || !horaInicio || !horaFim) {
            alert("Por favor, preencha todos os campos.");
            return;
        }

        // Verifica se o horário de fim é posterior ao de início
        if (horaFim <= horaInicio) {
            alert("O horário de fim deve ser posterior ao horário de início.");
            return;
        }

        // Formata a hora para garantir o formato correto (HH:MM:SS)
        const formatarHora = (hora) => {
            const partes = hora.split(":");
            return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}:00`;
        };

        const horaInicioFormatada = formatarHora(horaInicio);
        const horaFimFormatada = formatarHora(horaFim);

        // Criação do objeto de reserva
        const reserva = {
            nome: nome,
            sala: salaEscolhida,
            data: dataEscolhida,
            hora_inicio: horaInicioFormatada,
            hora_fim: horaFimFormatada
        };

        console.log('🔹 Dados da reserva antes do envio:', JSON.stringify(reserva, null, 2));


        fetch('https://api-tbpreco.onrender.com/reserva_input', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reserva)
        })
            .then(response => {
                // Verifica se a resposta foi bem-sucedida (status 2xx)
                if (!response.ok) {
                    // Tenta pegar o corpo da resposta para detalhes do erro
                    return response.json().then(errorData => {
                        console.error("❌ Erro na resposta da API:", errorData);
                        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
                    });
                }
                
                // Verifica se há conteúdo na resposta e a converte em JSON
                return response.json();
            })
            .then(data => {
                // Verifica se a resposta contém a mensagem de sucesso
                if (data.message && data.message === "Reserva inserida com sucesso!") {
                    alert('✅ Reserva inserida com sucesso!');
                } else {
                    throw new Error("Erro desconhecido ao processar a resposta da API.");
                }
                console.log("🔹 Resposta da API:", data);
            })
            .catch(error => {
                console.error('❌ Erro ao inserir a reserva:', error);
                
                // Exibe um alerta de erro com informações completas do erro
                alert(`Erro ao inserir reserva: ${error.message || 'Erro desconhecido'}\nDetalhes: ${error.stack}`);
            });
        
    });
})