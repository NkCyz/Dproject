def check_pkg(pkg, ver):
    try:
        import pkg_resources
        installed = pkg_resources.get_distribution(pkg)
        if ver.startswith('>='):
            return installed.version >= ver[2:]
        elif ver.startswith('=='):
            return installed.version == ver[2:]
        return True
    except:
        return False

if __name__ == '__main__':
    pkg_list = [
        ('flask', '==2.0.1'),
        ('flask-cors', '==3.0.10'),
        ('Flask-Limiter', '==3.5.0'),
        ('werkzeug', '==2.0.3'),
        ('reportlab', '==4.3.1'),
        ('Pillow', '==11.0.0'),
        ('langchain', '>=0.1.0'),
        ('langchain-community', '>=0.0.1'),
        ('zhipuai', '>=2.0.1'),
        ('python-dotenv', '==1.0.0'),
        ('tenacity', '==8.2.3')
    ]

    need_install = False
    for pkg, ver in pkg_list:
        if not check_pkg(pkg, ver):
            print(f'Package needed: {pkg} {ver}')
            need_install = True

    exit(1 if need_install else 0) 