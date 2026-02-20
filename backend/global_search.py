import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.apps import apps
from django.db.models import Q

search_str = "SALOM"
print(f"Global search for '{search_str}'...")

for model in apps.get_models():
    string_fields = [f.name for f in model._meta.get_fields() if isinstance(f, (django.db.models.CharField, django.db.models.TextField))]
    if not string_fields:
        continue
    
    query = Q()
    for field in string_fields:
        query |= Q(**{f"{field}__icontains": search_str})
    
    try:
        results = model.objects.filter(query)
        if results.exists():
            print(f"Model {model.__name__} has matches:")
            for obj in results:
                print(f"  - ID {obj.pk}: {obj}")
    except Exception as e:
        # Some fields might not support icontains or other issues
        pass
