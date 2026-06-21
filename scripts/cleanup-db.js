#!/usr/bin/env node

/**
 * Script de limpieza segura para Supabase
 * Verifica datos antes de eliminar y pide confirmación
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Falta configurar NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Crear interfaz para lectura de entrada
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function getRowCounts() {
  console.log('\n📊 Verificando registros en base de datos...\n');

  const tables = [
    'technicians',
    'tickets',
    'work_orders',
    'work_time_logs',
    'work_breaks',
    'incomplete_reports'
  ];

  const counts = {};

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      counts[table] = count || 0;
    } catch (error) {
      counts[table] = '❌ Error';
      console.error(`  Error al contar ${table}:`, error.message);
    }
  }

  return counts;
}

async function deleteData() {
  console.log('\n🗑️  Iniciando limpieza...\n');

  const tables = [
    'work_orders',
    'incomplete_reports',
    'work_breaks',
    'work_time_logs',
    'tickets',
    'technicians'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', 'null'); // Elimina todos (neq = not equal, ningún ID será diferente de null)

      if (error) throw error;
      console.log(`✅ ${table}: eliminado`);
    } catch (error) {
      console.error(`❌ Error al limpiar ${table}:`, error.message);
    }
  }
}

async function verifyCleanup() {
  console.log('\n✔️  Verificando limpieza...\n');

  const tables = ['technicians', 'tickets', 'work_orders', 'work_time_logs', 'work_breaks', 'incomplete_reports'];
  let allClean = true;

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      const status = count === 0 ? '✅' : '❌';
      console.log(`${status} ${table}: ${count} registros`);
      if (count > 0) allClean = false;
    } catch (error) {
      console.error(`❌ Error verificando ${table}:`, error.message);
      allClean = false;
    }
  }

  return allClean;
}

async function main() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('   LIMPIEZA SEGURA DE BASE DE DATOS');
  console.log('   (Producción - Registrar técnicos nuevos)');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Paso 1: Contar registros
    const counts = await getRowCounts();

    console.log('📋 Resumen de datos a ELIMINAR:');
    console.log('─────────────────────────────');
    for (const [table, count] of Object.entries(counts)) {
      console.log(`  • ${table.padEnd(20)} : ${count} registros`);
    }

    // Paso 2: Pedir confirmación
    console.log('\n⚠️  ADVERTENCIA:');
    console.log('  • Esta acción es IRREVERSIBLE');
    console.log('  • Asegúrate de tener BACKUP de tu base de datos');
    console.log('  • Se eliminarán TODOS los técnicos y datos relacionados\n');

    const answer1 = await prompt('¿Deseas continuar? (escribe "si" para confirmar): ');
    if (answer1.toLowerCase() !== 'si') {
      console.log('\n❌ Operación cancelada.');
      rl.close();
      process.exit(0);
    }

    const answer2 = await prompt('Confirma nuevamente escribiendo "ELIMINAR TODOS": ');
    if (answer2 !== 'ELIMINAR TODOS') {
      console.log('\n❌ Operación cancelada.');
      rl.close();
      process.exit(0);
    }

    // Paso 3: Eliminar datos
    await deleteData();

    // Paso 4: Verificar eliminación
    const isClean = await verifyCleanup();

    if (isClean) {
      console.log('\n✅ ¡LIMPIEZA COMPLETADA EXITOSAMENTE!');
      console.log('   Base de datos lista para registrar técnicos nuevos.\n');
    } else {
      console.log('\n⚠️  Limpieza parcial: algunos datos aún existen.');
      console.log('   Intenta nuevamente o verifica manualmente.\n');
    }

  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
