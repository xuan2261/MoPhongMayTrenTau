"""Owned QA witness: consumes injected SPACE key releases; no user app input."""
import tkinter as tk
root=tk.Tk();root.title('FCV588-P22-OWNED-KEYBOARD-WITNESS-20261117');root.geometry('420x180+46+64')
label=tk.Label(root,text='P22 QA-owned Windows keyboard witness',font=('Segoe UI',12));label.pack(pady=23)
label2=tk.Label(root,text='Absorbs OS-injected key release; not the user application',font=('Segoe UI',9));label2.pack()
root.bind('<KeyPress>',lambda e:None)
root.bind('<KeyRelease>',lambda e:None)
root.after(150,root.focus_force)
root.mainloop()