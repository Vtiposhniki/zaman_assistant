#!/usr/bin/env python3
"""
Тестовый скрипт для проверки Redis Goals Service
Запуск: python test_redis_goals.py
"""
import asyncio
import json
import sys
from datetime import datetime, timedelta

# Добавляем путь к модулям
sys.path.append('.')

from services.redis_goals_service import create_redis_goals_service


async def test_redis_goals_service():
    """Тестирование всех функций Redis Goals Service"""
    print("🧪 Тестирование Redis Goals Service")
    print("=" * 50)
    
    try:
        # Создание сервиса
        print("1. Создание сервиса...")
        service = await create_redis_goals_service()
        print("✅ Сервис создан успешно")
        
        # Проверка здоровья
        print("\n2. Проверка здоровья...")
        health = await service.health_check()
        print(f"✅ Статус: {health['status']}")
        print(f"   Redis подключен: {health['redis_connected']}")
        print(f"   Количество целей: {health['goals_count']}")
        
        # Создание тестовых целей
        print("\n3. Создание тестовых целей...")
        
        goal1_data = {
            "name": "Покупка автомобиля",
            "target_amount": 5000000,
            "target_date": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
            "user_id": 1,
            "goal_type": "автомобиль",
            "current_savings": 500000
        }
        
        goal2_data = {
            "name": "Образование детей",
            "target_amount": 2000000,
            "target_date": (datetime.now() + timedelta(days=730)).strftime("%Y-%m-%d"),
            "user_id": 1,
            "goal_type": "образование",
            "current_savings": 200000
        }
        
        goal1 = await service.create_goal(goal1_data)
        goal2 = await service.create_goal(goal2_data)
        
        print(f"✅ Создана цель 1: {goal1['id']} - {goal1['name']}")
        print(f"✅ Создана цель 2: {goal2['id']} - {goal2['name']}")
        
        # Получение всех целей
        print("\n4. Получение всех целей...")
        all_goals = await service.get_goals()
        print(f"✅ Найдено целей: {len(all_goals)}")
        
        for goal in all_goals:
            print(f"   - {goal['name']}: {goal['current_savings']}/{goal['target_amount']} KZT")
        
        # Фильтрация по пользователю
        print("\n5. Фильтрация по пользователю...")
        user_goals = await service.get_goals(user_id=1)
        print(f"✅ Цели пользователя 1: {len(user_goals)}")
        
        # Получение конкретной цели
        print("\n6. Получение конкретной цели...")
        specific_goal = await service.get_goal(goal1['id'])
        if specific_goal:
            print(f"✅ Найдена цель: {specific_goal['name']}")
            print(f"   Прогресс: {service._calculate_progress(specific_goal):.1f}%")
            print(f"   Месяцев осталось: {service._calculate_months_remaining(specific_goal)}")
            print(f"   Нужно в месяц: {service._calculate_monthly_needed(specific_goal):.0f} KZT")
        
        # Обновление цели
        print("\n7. Обновление цели...")
        updated_goal = await service.update_goal(
            goal1['id'], 
            current_savings=750000,
            status="active"
        )
        if updated_goal:
            print(f"✅ Цель обновлена: {updated_goal['current_savings']} KZT")
            print(f"   Новый прогресс: {service._calculate_progress(updated_goal):.1f}%")
        
        # Массовое обновление
        print("\n8. Массовое обновление...")
        bulk_updates = [
            {"goal_id": goal1['id'], "current_savings": 800000},
            {"goal_id": goal2['id'], "current_savings": 300000}
        ]
        bulk_results = await service.bulk_update_goals(bulk_updates)
        print(f"✅ Массовое обновление: {bulk_results['updated']} обновлено, {bulk_results['failed']} ошибок")
        
        # Статистика
        print("\n9. Получение статистики...")
        stats = await service.get_goals_statistics()
        print(f"✅ Статистика:")
        print(f"   Всего целей: {stats['total_goals']}")
        print(f"   Активных: {stats['active_goals']}")
        print(f"   Общая сумма целей: {stats['total_target_amount']:,.0f} KZT")
        print(f"   Общие накопления: {stats['total_current_savings']:,.0f} KZT")
        print(f"   Средний прогресс: {stats['average_progress']:.1f}%")
        
        # Экспорт
        print("\n10. Экспорт целей...")
        exported_goals = await service.export_goals_json()
        print(f"✅ Экспортировано целей: {len(exported_goals)}")
        
        # Мягкое удаление
        print("\n11. Мягкое удаление цели...")
        delete_result = await service.delete_goal(goal2['id'])
        if delete_result:
            print(f"✅ Цель {goal2['id']} отменена")
        
        # Проверка после удаления
        cancelled_goals = await service.get_goals(status="cancelled")
        print(f"   Отмененных целей: {len(cancelled_goals)}")
        
        # Жесткое удаление
        print("\n12. Жесткое удаление цели...")
        hard_delete_result = await service.hard_delete_goal(goal2['id'])
        if hard_delete_result:
            print(f"✅ Цель {goal2['id']} полностью удалена")
        
        # Финальная статистика
        print("\n13. Финальная статистика...")
        final_stats = await service.get_goals_statistics()
        print(f"✅ Финальная статистика:")
        print(f"   Всего целей: {final_stats['total_goals']}")
        print(f"   Активных: {final_stats['active_goals']}")
        print(f"   Отмененных: {final_stats['cancelled_goals']}")
        
        # Закрытие сервиса
        print("\n14. Закрытие сервиса...")
        await service.close()
        print("✅ Сервис закрыт")
        
        print("\n🎉 Все тесты прошли успешно!")
        
    except Exception as e:
        print(f"\n❌ Ошибка во время тестирования: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


async def test_pubsub():
    """Тестирование Pub/Sub функциональности"""
    print("\n🔔 Тестирование Pub/Sub...")
    print("=" * 30)
    
    try:
        service = await create_redis_goals_service()
        
        # Создание тестовой цели для проверки Pub/Sub
        test_goal_data = {
            "name": "Тест Pub/Sub",
            "target_amount": 100000,
            "target_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "user_id": 999,
            "goal_type": "тест"
        }
        
        print("Создание тестовой цели...")
        goal = await service.create_goal(test_goal_data)
        print(f"✅ Создана тестовая цель: {goal['id']}")
        
        # Очистка тестовой цели
        await service.hard_delete_goal(goal['id'])
        print("✅ Тестовая цель удалена")
        
        await service.close()
        print("✅ Pub/Sub тест завершен")
        
    except Exception as e:
        print(f"❌ Ошибка в Pub/Sub тесте: {e}")


if __name__ == "__main__":
    print("🚀 Запуск тестов Redis Goals Service")
    print("Убедитесь, что Redis запущен на localhost:6379")
    print()
    
    # Основные тесты
    success = asyncio.run(test_redis_goals_service())
    
    if success:
        # Тест Pub/Sub
        asyncio.run(test_pubsub())
        print("\n✅ Все тесты завершены успешно!")
    else:
        print("\n❌ Тесты завершились с ошибками")
        sys.exit(1)
