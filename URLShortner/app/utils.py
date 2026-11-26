
BASE62_CHARACTERS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"


def generate_short_code(number):
    if number == 0:
        return BASE62_CHARACTERS[0]

    result = ""

    while number > 0:
        remainder = number % 62
        result = BASE62_CHARACTERS[remainder] + result
        number = number // 62

    return result
    