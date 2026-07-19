<?php

function ai_estimator(array $user, array $body): array
{
    $action = $body['action'] ?? 'calculate_materials';
    $data = $body['data'] ?? [];

    if ($action === 'calculate_materials') {
        $services = $data['services'] ?? [];
        $materials = crm_records('materials', $user['id']);
        $serviceCatalog = crm_records('services', $user['id']);
        $calculations = [];

        foreach ($services as $service) {
            $quantity = (float)($service['quantity'] ?? $service['area'] ?? 1);
            $serviceName = $service['service'] ?? $service['service_name'] ?? 'Работа';
            $dbService = first_by_name($serviceCatalog, $serviceName);
            $servicePrice = $dbService ? ((float)($dbService['price'] ?? 0) * $quantity) : 0;
            $items = [];

            foreach (($service['materials'] ?? []) as $m) {
                $dbMaterial = first_by_name($materials, $m['material_name'] ?? $m['name'] ?? '');
                $mQty = (float)($m['quantity'] ?? 0);
                $unitPrice = $dbMaterial ? (float)($dbMaterial['price'] ?? 0) : 0;
                $items[] = [
                    'material_id' => $dbMaterial['id'] ?? null,
                    'name' => $dbMaterial['name'] ?? ($m['material_name'] ?? $m['name'] ?? ''),
                    'unit' => $m['unit'] ?? ($dbMaterial['unit'] ?? ''),
                    'quantity' => $mQty,
                    'calculation' => $m['calculation'] ?? '',
                    'unit_price' => $unitPrice,
                    'total_price' => round($unitPrice * $mQty, 2),
                ];
            }

            $total = $servicePrice + array_sum(array_map(fn($m) => $m['total_price'] ?? 0, $items));
            $calculations[] = [
                'service' => $serviceName,
                'quantity' => $quantity,
                'unit' => $service['unit'] ?? ($dbService['unit'] ?? ''),
                'materials' => $items,
                'service_price' => round($servicePrice, 2),
                'total_cost' => round($total, 2),
            ];
        }

        return ['success' => true, 'calculations' => $calculations];
    }

    if ($action === 'create_estimate') {
        $estimate = $data['estimate'] ?? [];
        $estimate['id'] = $estimate['id'] ?? uuidv4();
        $estimate['user_id'] = $user['id'];
        $estimate['status'] = $estimate['status'] ?? 'draft';
        $estimate['created_at'] = now_iso();
        save_record('estimates', $user['id'], $estimate);
        return ['success' => true, 'estimate' => $estimate];
    }

    return ['success' => false, 'error' => 'Неизвестное действие AI-сметчика'];
}

function first_by_name(array $rows, string $name): ?array
{
    $needle = mb_strtolower(trim($name));
    foreach ($rows as $row) {
        $rowName = mb_strtolower(trim($row['name'] ?? ''));
        if ($rowName && ($rowName === $needle || str_contains($needle, $rowName) || str_contains($rowName, $needle))) return $row;
    }
    return null;
}
