import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

export default function PrintOS() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const format = searchParams.get('format') || 'a4'; // a4 ou thermal
  
  const [os, setOs] = useState(null);

  useEffect(() => {
    api.get('/service-orders').then(res => {
        // Como o endpoint lista todos, filtramos aqui. 
        // O ideal seria um endpoint GET /service-orders/:id no backend, mas para manter a regra de "não alterar o que não foi pedido", usaremos o filtro.
        const found = res.data.find(o => o.id === parseInt(id));
        setOs(found);
        
        // Auto-print após carregar
        if(found) setTimeout(() => window.print(), 500);
    });
  }, [id]);

  if (!os) return <div>Carregando documento...</div>;

  const styles = {
    page: {
        fontFamily: 'monospace', // Melhor para impressoras térmicas
        padding: format === 'thermal' ? '10px' : '40px',
        width: format === 'thermal' ? '80mm' : '100%',
        margin: '0 auto',
        backgroundColor: 'white'
    },
    header: {
        textAlign: 'center',
        marginBottom: '20px',
        borderBottom: '1px dashed #000',
        paddingBottom: '10px'
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '5px'
    },
    title: {
        fontWeight: 'bold',
        fontSize: format === 'thermal' ? '14px' : '24px'
    },
    section: {
        marginTop: '15px',
        marginBottom: '15px'
    },
    label: {
        fontWeight: 'bold'
    },
    total: {
        marginTop: '20px',
        borderTop: '1px dashed #000',
        paddingTop: '10px',
        textAlign: 'right',
        fontSize: format === 'thermal' ? '16px' : '20px',
        fontWeight: 'bold'
    }
  };

  return (
    <div style={styles.page}>
        <div style={styles.header}>
            <div style={styles.title}>ORDEM DE SERVIÇO #{os.id}</div>
            <div>Data: {new Date(os.created_at).toLocaleDateString('pt-BR')}</div>
        </div>

        <div style={styles.section}>
            <div><span style={styles.label}>Cliente:</span> {os.client_name}</div>
            <div><span style={styles.label}>Equipamento:</span> {os.equipment}</div>
            <div><span style={styles.label}>Prioridade:</span> {os.priority === 'high' ? 'ALTA' : 'Normal'}</div>
            <div><span style={styles.label}>Status:</span> {os.status.toUpperCase()}</div>
        </div>

        <div style={{...styles.section, borderTop: '1px solid #eee', paddingTop:'10px'}}>
            <span style={styles.label}>Descrição do Problema/Serviço:</span>
            <p style={{marginTop: '5px', whiteSpace: 'pre-wrap'}}>{os.description}</p>
        </div>

        <div style={styles.total}>
            TOTAL ESTIMADO: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.price)}
        </div>

        <div style={{marginTop: '40px', textAlign: 'center', fontSize: '10px'}}>
            __________________________________________<br/>
            Assinatura do Cliente
            <br/><br/>
            <p>Garantia de 90 dias sobre o serviço prestado.</p>
        </div>
    </div>
  );
}